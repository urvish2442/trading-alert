/**
 * Option Premium Retrieval & Fill Simulation Service
 * Conforms to GEMINI.md Section 11.5
 */

import { getActiveKiteAccessToken, KITE_API_BASE_URL } from "@/lib/kite/client";

/**
 * Computes an estimated option premium based on intrinsic value + time value
 * Used in Demo Mode (Yahoo Finance provider) when Kite API subscription is not active.
 *
 * @param {object} params
 * @param {number} params.spotPrice - Reference spot price
 * @param {number} params.strikePrice - Option strike price
 * @param {string} params.optionType - "CE" or "PE"
 * @param {Date} params.expiryDate - Option expiry date
 * @returns {number} Estimated option premium in points
 */
export function estimateDemoOptionPremium({ spotPrice, strikePrice, optionType, expiryDate }) {
  const normType = String(optionType).toUpperCase();
  const spot = Number(spotPrice) || 24000;
  const strike = Number(strikePrice) || spot;

  // 1. Intrinsic Value
  let intrinsic = 0;
  if (normType === "CE") {
    intrinsic = Math.max(0, spot - strike);
  } else {
    intrinsic = Math.max(0, strike - spot);
  }

  // 2. Extrinsic / Time Value (decaying towards expiry)
  const now = Date.now();
  const expTime = new Date(expiryDate).getTime();
  const diffDays = Math.max(0.1, (expTime - now) / (1000 * 60 * 60 * 24));

  // Approximate ATM volatility (IV ~12% - 15% for NIFTY)
  const atmVolPoints = spot * 0.008 * Math.sqrt(diffDays / 7);
  const timeValue = Math.max(15, atmVolPoints * 0.7);

  const totalPremium = Math.max(2.0, intrinsic + timeValue);
  return Number(totalPremium.toFixed(2));
}

/**
 * Fetches option quote and determines execution fill price
 *
 * @param {object} params
 * @param {number} params.instrumentToken - Kite instrument token
 * @param {string} params.tradingSymbol - Instrument trading symbol (e.g. NFO:NIFTY26FEB26150CE)
 * @param {string} params.action - "BUY" (entry) or "SELL" (exit)
 * @param {string} [params.preferredFillMethod="ASK_BID"] - "ASK_BID" or "LTP"
 * @param {number} [params.freshnessLimitSeconds=60] - Maximum allowed quote age
 * @param {object} [params.fallbackParams=null] - Parameters for demo estimation if Kite API is offline
 * @returns {Promise<{ fillPrice: number, fillMethod: string, quoteTimestamp: Date, isStale: boolean, rawQuote: object | null }>}
 */
export async function getOptionExecutionPremium({
  instrumentToken,
  tradingSymbol,
  action = "BUY",
  preferredFillMethod = "ASK_BID",
  freshnessLimitSeconds = 60,
  fallbackParams = null,
}) {
  const apiKey = process.env.KITE_API_KEY;
  const accessToken = await getActiveKiteAccessToken();

  let rawQuote = null;
  let quoteTimestamp = new Date();
  let fillPrice = null;
  let fillMethod = preferredFillMethod;

  // Try fetching live quote from Kite Connect API
  if (apiKey && accessToken && instrumentToken) {
    try {
      const quoteSymbol = tradingSymbol.startsWith("NFO:") ? tradingSymbol : `NFO:${tradingSymbol}`;
      const url = `${KITE_API_BASE_URL}/quote?i=${encodeURIComponent(quoteSymbol)}`;
      const res = await fetch(url, {
        headers: {
          "X-Kite-Version": "3",
          Authorization: `token ${apiKey}:${accessToken}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data?.[quoteSymbol];
        if (data) {
          rawQuote = data;
          quoteTimestamp = data.timestamp ? new Date(data.timestamp) : new Date();

          const depth = data.depth;
          const bestAsk = depth?.buy?.[0]?.price || depth?.sell?.[0]?.price || data.last_price;
          const bestBid = depth?.sell?.[0]?.price || depth?.buy?.[0]?.price || data.last_price;

          if (preferredFillMethod === "ASK_BID") {
            if (action === "BUY") {
              fillPrice = bestAsk > 0 ? bestAsk : data.last_price;
              fillMethod = "ASK";
            } else {
              fillPrice = bestBid > 0 ? bestBid : data.last_price;
              fillMethod = "BID";
            }
          } else {
            fillPrice = data.last_price;
            fillMethod = "LTP";
          }
        }
      }
    } catch (err) {
      console.warn("Kite quote API fetch error:", err.message);
    }
  }

  // Fallback to demo mode simulation if Kite quote is unavailable
  if (!fillPrice || fillPrice <= 0) {
    if (fallbackParams) {
      fillPrice = estimateDemoOptionPremium(fallbackParams);
      // Add slight bid/ask spread for realism (+0.5 pt on ask for buy, -0.5 pt on bid for sell)
      if (preferredFillMethod === "ASK_BID") {
        fillPrice = action === "BUY" ? fillPrice + 0.5 : Math.max(1, fillPrice - 0.5);
        fillMethod = action === "BUY" ? "ASK" : "BID";
      } else {
        fillMethod = "LTP";
      }
      quoteTimestamp = new Date();
    } else {
      throw new Error(`Unable to resolve option premium for ${tradingSymbol}`);
    }
  }

  const ageSeconds = Math.floor((Date.now() - quoteTimestamp.getTime()) / 1000);
  const isStale = ageSeconds > freshnessLimitSeconds;

  return {
    fillPrice: Number(fillPrice.toFixed(2)),
    fillMethod,
    quoteTimestamp,
    isStale,
    rawQuote,
  };
}

