/**
 * Position Manager & Lifecycle Engine for Options Paper Trading
 * Conforms to GEMINI.md Section 11.6 & 11.7
 */

import { connectToDatabase } from "@/lib/mongodb/connection";
import PaperTrade from "@/lib/mongodb/models/PaperTrade";
import SystemLog from "@/lib/mongodb/models/SystemLog";
import { resolveOptionContract } from "./contract-resolver";
import { getOptionExecutionPremium } from "./premium-service";
import { calculateTotalQuantity, calculateTradePnl } from "./pnl-engine";
import { isExpirySafetyCutoffReached } from "./expiry-resolver";

/**
 * Retrieves the currently active OPEN paper trade for a given strategy
 * @param {string | object} strategyId
 * @returns {Promise<object | null>}
 */
export async function getOpenPaperPosition(strategyId) {
  await connectToDatabase();
  return PaperTrade.findOne({ strategyId, status: "OPEN" }).lean();
}

/**
 * Opens a simulated paper option position
 *
 * @param {object} params
 * @param {string} params.strategyId
 * @param {string} params.signalId
 * @param {number} params.spotPrice - Reference spot price at signal time
 * @param {string} params.optionType - "CE" (for BUY signal) or "PE" (for SELL signal)
 * @param {object} params.settings - Paper trading settings
 * @returns {Promise<object>} Created trade document
 */
export async function openPaperPosition({
  strategyId,
  signalId,
  spotPrice,
  optionType,
  settings,
}) {
  await connectToDatabase();

  // 1. Guard against concurrent / duplicate open positions
  const existingOpen = await PaperTrade.findOne({ strategyId, status: "OPEN" });
  if (existingOpen) {
    throw new Error(
      `Cannot open new position: Trade ${existingOpen.tradeId} (${existingOpen.optionSymbol}) is already OPEN.`
    );
  }

  // 2. Resolve target ITM weekly contract
  const contract = await resolveOptionContract({
    spotPrice,
    optionType,
    itmDistance: settings.itmDistance || 100,
  });

  // 3. Fetch simulated / live execution premium
  const premiumData = await getOptionExecutionPremium({
    instrumentToken: contract.instrumentToken,
    tradingSymbol: contract.tradingSymbol,
    action: "BUY",
    preferredFillMethod: settings.fillMethod || "ASK_BID",
    freshnessLimitSeconds: settings.quoteFreshnessLimit || 60,
    fallbackParams: {
      spotPrice,
      strikePrice: contract.strikePrice,
      optionType: contract.optionType,
      expiryDate: contract.expiryDate,
    },
  });

  // 4. Calculate quantities
  const totalQuantity = calculateTotalQuantity(contract.lotSize, settings.numberOfLots || 1);
  const tradeId = `PT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // 5. Create immutable trade record
  const newTrade = await PaperTrade.create({
    tradeId,
    strategyId,
    signalId,
    underlying: contract.underlying,
    exchange: contract.exchange,
    optionSymbol: contract.tradingSymbol,
    instrumentToken: contract.instrumentToken,
    optionType: contract.optionType,
    strikePrice: contract.strikePrice,
    expiryDate: contract.expiryDate,
    entryPremium: premiumData.fillPrice,
    entryTimestamp: new Date(),
    entrySpotPrice: spotPrice,
    entryQuantity: totalQuantity,
    lotSize: contract.lotSize,
    numberOfLots: settings.numberOfLots || 1,
    totalQuantity,
    entryFillMethod: premiumData.fillMethod,
    currentPremium: premiumData.fillPrice,
    currentPremiumTimestamp: premiumData.quoteTimestamp,
    unrealizedPnl: 0,
    status: "OPEN",
  });

  await SystemLog.create({
    category: "PAPER_TRADING",
    level: "INFO",
    message: `Opened paper position ${tradeId}: BUY ${contract.tradingSymbol} @ ₹${premiumData.fillPrice} (${totalQuantity} units)`,
    metadata: { tradeId, signalId, spotPrice, premiumData },
  });

  return newTrade;
}

/**
 * Closes an active simulated paper position
 *
 * @param {object} params
 * @param {string} params.tradeId
 * @param {string} params.exitReason - "OPPOSITE_SIGNAL" | "STRATEGY_EXIT" | "MANUAL_EXIT" | "EXPIRY_CUTOFF"
 * @param {number} [params.spotPrice=null] - Spot price for premium estimation if needed
 * @param {object} [params.settings=null]
 * @returns {Promise<object>} Closed trade document
 */
export async function closePaperPosition({
  tradeId,
  exitReason,
  spotPrice = null,
  settings = {},
}) {
  await connectToDatabase();

  const trade = await PaperTrade.findOne({ tradeId, status: "OPEN" });
  if (!trade) {
    throw new Error(`Open paper trade ${tradeId} not found or already closed`);
  }

  // Fetch exit fill price (Selling to close -> BID price or LTP)
  const premiumData = await getOptionExecutionPremium({
    instrumentToken: trade.instrumentToken,
    tradingSymbol: trade.optionSymbol,
    action: "SELL",
    preferredFillMethod: settings.fillMethod || "ASK_BID",
    freshnessLimitSeconds: settings.quoteFreshnessLimit || 60,
    fallbackParams: {
      spotPrice: spotPrice || trade.entrySpotPrice,
      strikePrice: trade.strikePrice,
      optionType: trade.optionType,
      expiryDate: trade.expiryDate,
    },
  });

  const pnl = calculateTradePnl({
    entryPremium: trade.entryPremium,
    currentOrExitPremium: premiumData.fillPrice,
    totalQuantity: trade.totalQuantity,
    estimatedCharges: settings.estimatedCharges || 0,
  });

  trade.exitPremium = premiumData.fillPrice;
  trade.exitTimestamp = new Date();
  trade.exitReason = exitReason;
  trade.exitFillMethod = premiumData.fillMethod;
  trade.grossPnl = pnl.grossPnl;
  trade.estimatedCharges = pnl.estimatedCharges;
  trade.netPnl = pnl.netPnl;
  trade.returnPercentage = pnl.returnPercentage;
  trade.currentPremium = premiumData.fillPrice;
  trade.unrealizedPnl = 0;
  trade.status = exitReason === "EXPIRY_CUTOFF" ? "EXPIRED" : "CLOSED";

  await trade.save();

  await SystemLog.create({
    category: "PAPER_TRADING",
    level: "INFO",
    message: `Closed paper position ${trade.tradeId} (${trade.optionSymbol}): Exit @ ₹${premiumData.fillPrice}, Net P&L: ₹${pnl.netPnl} (${exitReason})`,
    metadata: { tradeId: trade.tradeId, pnl, exitReason },
  });

  return trade;
}

/**
 * Reverses an active paper position upon opposite strategy signal
 * Decoupled: Successfully closes existing position first; if new entry fails, error is logged without corrupting exit.
 *
 * @param {object} params
 * @param {object} params.currentTrade - Existing active trade
 * @param {string} params.signalId - New signal ID
 * @param {number} params.spotPrice - Current spot price
 * @param {string} params.newOptionType - "CE" or "PE"
 * @param {object} params.settings - Paper settings
 * @returns {Promise<{ closedTrade: object, newTrade: object | null, error: string | null }>}
 */
export async function reversePaperPosition({
  currentTrade,
  signalId,
  spotPrice,
  newOptionType,
  settings,
}) {
  // 1. Close old position
  const closedTrade = await closePaperPosition({
    tradeId: currentTrade.tradeId,
    exitReason: "OPPOSITE_SIGNAL",
    spotPrice,
    settings,
  });

  // 2. Open new opposite position
  let newTrade = null;
  let error = null;

  try {
    newTrade = await openPaperPosition({
      strategyId: currentTrade.strategyId,
      signalId,
      spotPrice,
      optionType: newOptionType,
      settings,
    });
  } catch (err) {
    error = err.message;
    await SystemLog.create({
      category: "PAPER_TRADING",
      level: "ERROR",
      message: `Failed to open reversed position after closing ${currentTrade.tradeId}: ${err.message}`,
      metadata: { closedTradeId: currentTrade.tradeId, signalId, error: err.message },
    });
  }

  return { closedTrade, newTrade, error };
}

/**
 * Scans open positions and closes any position reaching the expiry-day safety cutoff
 * @param {object} [settings={}]
 * @returns {Promise<Array<object>>} Closed trades
 */
export async function checkAndCloseExpirySafety(settings = {}) {
  await connectToDatabase();
  const openTrades = await PaperTrade.find({ status: "OPEN" });
  const closed = [];

  const now = new Date();
  for (const trade of openTrades) {
    if (isExpirySafetyCutoffReached(trade.expiryDate, now, "15:15")) {
      try {
        const closedTrade = await closePaperPosition({
          tradeId: trade.tradeId,
          exitReason: "EXPIRY_CUTOFF",
          spotPrice: trade.entrySpotPrice,
          settings,
        });
        closed.push(closedTrade);
      } catch (err) {
        console.error(`Error closing trade on expiry cutoff ${trade.tradeId}:`, err);
      }
    }
  }

  return closed;
}

/**
 * Updates live premium and unrealized P&L for an active open position
 * @param {object} trade
 * @param {number} spotPrice
 * @param {object} settings
 * @returns {Promise<object>}
 */
export async function updatePositionMarketValuation(trade, spotPrice, settings = {}) {
  if (!trade || trade.status !== "OPEN") return trade;

  try {
    const premiumData = await getOptionExecutionPremium({
      instrumentToken: trade.instrumentToken,
      tradingSymbol: trade.optionSymbol,
      action: "SELL",
      preferredFillMethod: settings.fillMethod || "ASK_BID",
      freshnessLimitSeconds: settings.quoteFreshnessLimit || 60,
      fallbackParams: {
        spotPrice: spotPrice || trade.entrySpotPrice,
        strikePrice: trade.strikePrice,
        optionType: trade.optionType,
        expiryDate: trade.expiryDate,
      },
    });

    const pnl = calculateTradePnl({
      entryPremium: trade.entryPremium,
      currentOrExitPremium: premiumData.fillPrice,
      totalQuantity: trade.totalQuantity,
      estimatedCharges: settings.estimatedCharges || 0,
    });

    trade.currentPremium = premiumData.fillPrice;
    trade.currentPremiumTimestamp = premiumData.quoteTimestamp;
    trade.unrealizedPnl = pnl.grossPnl;
    trade.returnPercentage = pnl.returnPercentage;

    await trade.save();
  } catch (err) {
    console.warn(`Could not update live valuation for trade ${trade.tradeId}:`, err.message);
  }

  return trade;
}
