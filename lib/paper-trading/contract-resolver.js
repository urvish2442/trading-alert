/**
 * Dynamic Contract Resolver for NIFTY Options
 * Conforms to GEMINI.md Section 11.4
 */

import { connectToDatabase } from "@/lib/mongodb/connection";
import Instrument from "@/lib/mongodb/models/Instrument";
import { selectItmStrike } from "./strike-selector";
import { resolveCurrentWeeklyExpiry, getIstDateString } from "./expiry-resolver";

const DEFAULT_NIFTY_LOT_SIZE = 75;

/**
 * Generates synthetic NSE trading symbol for NIFTY options when master is offline
 * e.g., NIFTY2622726150CE (Year 26, Month 2, Day 27, Strike 26150, CE)
 * @param {object} params
 * @returns {string}
 */
export function generateNiftyOptionSymbol({ expiryDate, strikePrice, optionType }) {
  const d = new Date(expiryDate);
  const yy = String(d.getFullYear()).slice(-2);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const mmm = months[d.getMonth()] || "EXP";
  return `NIFTY${yy}${mmm}${strikePrice}${optionType.toUpperCase()}`;
}

/**
 * Resolves the active NIFTY option contract matching directional signal, spot price, and expiry
 *
 * @param {object} params
 * @param {number} params.spotPrice - Current live NIFTY 50 spot price
 * @param {string} params.optionType - "CE" or "PE"
 * @param {number} [params.itmDistance=100] - In-The-Money distance in points (default: 100)
 * @param {number} [params.strikeInterval=50] - Strike interval in points (default: 50)
 * @param {Date} [params.referenceDate=new Date()] - Reference date for expiry calculation
 * @returns {Promise<object>} Resolved contract details
 */
export async function resolveOptionContract({
  spotPrice,
  optionType,
  itmDistance = 100,
  strikeInterval = 50,
  referenceDate = new Date(),
}) {
  const normType = String(optionType).toUpperCase();
  if (normType !== "CE" && normType !== "PE") {
    throw new Error(`Invalid option type "${optionType}"`);
  }

  // 1. Calculate ITM Strike
  const strikeInfo = selectItmStrike({
    spotPrice,
    optionType: normType,
    itmDistance,
    strikeInterval,
  });

  const targetStrike = strikeInfo.selectedStrike;

  let resolvedExpiry = null;
  let matchingInstrument = null;

  // 2. Query MongoDB instruments collection for available weekly expiries if DB is available
  try {
    await connectToDatabase();
    // Find all active NIFTY option instruments for target strike & option type
    const availableExpiries = await Instrument.distinct("expiry", {
      name: "NIFTY",
      instrumentType: normType,
      isActive: true,
      expiry: { $gte: new Date(getIstDateString(referenceDate)) },
    });

    if (availableExpiries && availableExpiries.length > 0) {
      resolvedExpiry = resolveCurrentWeeklyExpiry(availableExpiries, referenceDate);
      if (resolvedExpiry) {
        matchingInstrument = await Instrument.findOne({
          name: "NIFTY",
          instrumentType: normType,
          strikePrice: targetStrike,
          expiry: resolvedExpiry,
          isActive: true,
        }).lean();
      }
    }
  } catch {
    // Graceful fallback to synthetic contract resolution when master DB is offline
  }

  // Fallback if instrument master collection is empty or in Yahoo demo mode:
  // Dynamically compute the upcoming weekly expiry (default next Thursday or closest trading day)
  if (!resolvedExpiry) {
    const cur = new Date(referenceDate);
    // Find upcoming Thursday (day 4)
    const dayOfWeek = cur.getDay();
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
    const fallbackDate = new Date(cur);
    fallbackDate.setDate(cur.getDate() + (dayOfWeek === 4 ? 0 : daysUntilThursday));
    fallbackDate.setHours(15, 30, 0, 0);
    resolvedExpiry = fallbackDate;
  }

  const tradingSymbol =
    matchingInstrument?.tradingSymbol ||
    generateNiftyOptionSymbol({
      expiryDate: resolvedExpiry,
      strikePrice: targetStrike,
      optionType: normType,
    });

  const instrumentToken =
    matchingInstrument?.instrumentToken ||
    Math.abs(
      (tradingSymbol.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0) % 9000000) +
        1000000
    );

  const lotSize = matchingInstrument?.lotSize || DEFAULT_NIFTY_LOT_SIZE;

  return {
    underlying: "NIFTY 50",
    exchange: matchingInstrument?.exchange || "NFO",
    tradingSymbol,
    instrumentToken,
    optionType: normType,
    strikePrice: targetStrike,
    atmStrike: strikeInfo.atmStrike,
    itmDistance: strikeInfo.itmDistance,
    expiryDate: resolvedExpiry,
    lotSize,
    isRealContract: Boolean(matchingInstrument),
  };
}
