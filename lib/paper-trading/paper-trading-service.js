/**
 * Master Paper Trading Service Orchestrator
 * Conforms to GEMINI.md Section 11 & Section 14
 */

import { connectToDatabase } from "@/lib/mongodb/connection";
import PaperTrade from "@/lib/mongodb/models/PaperTrade";
import PaperTradingSettings from "@/lib/mongodb/models/PaperTradingSettings";
import { getOrCreateDefaultStrategy } from "@/lib/strategy/signal-engine";
import {
  getOpenPaperPosition,
  openPaperPosition,
  closePaperPosition,
  reversePaperPosition,
  checkAndCloseExpirySafety,
  updatePositionMarketValuation,
} from "./position-manager";
import { getIstDateString } from "./expiry-resolver";

/**
 * Returns or initializes paper trading settings for a strategy
 * @param {string | object} [strategyId=null]
 * @returns {Promise<object>}
 */
export async function getOrCreatePaperSettings(strategyId = null) {
  await connectToDatabase();

  let targetStratId = strategyId;
  if (!targetStratId) {
    const defaultStrategy = await getOrCreateDefaultStrategy();
    targetStratId = defaultStrategy._id;
  }

  let settings = await PaperTradingSettings.findOne({ strategyId: targetStratId });
  if (!settings) {
    settings = await PaperTradingSettings.create({
      strategyId: targetStratId,
      enabled: true,
      underlying: "NIFTY 50",
      expirySelection: "CURRENT_WEEK",
      itmDistance: 100,
      numberOfLots: 1,
      fillMethod: "ASK_BID",
      exitOnNeutral: false,
      estimatedCharges: 0,
      quoteFreshnessLimit: 60,
    });
  }

  return settings;
}

/**
 * Updates paper trading settings
 * @param {string} strategyId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updatePaperSettings(strategyId, updates) {
  await connectToDatabase();
  const settings = await PaperTradingSettings.findOneAndUpdate(
    { strategyId },
    { $set: updates },
    { new: true, upsert: true }
  );
  return settings;
}

/**
 * Evaluates confirmed strategy signal for automated paper-trade execution
 *
 * @param {object} signal - Confirmed strategy signal
 * @param {number} spotPrice - Current spot price
 * @returns {Promise<object>} Execution result
 */
export async function processSignalForPaperTrading(signal, spotPrice) {
  if (!signal || !signal.signalType) {
    return { executed: false, reason: "Invalid signal" };
  }

  await connectToDatabase();
  const settings = await getOrCreatePaperSettings(signal.strategyId);

  if (!settings.enabled) {
    return { executed: false, reason: "Paper trading disabled in settings" };
  }

  // 1. Run expiry cutoff safety check first
  await checkAndCloseExpirySafety(settings);

  // 2. Retrieve active open position
  const activeTrade = await getOpenPaperPosition(signal.strategyId);
  const signalType = signal.signalType; // "BUY CALL" | "BUY PUT" | "EXIT CALL" | "EXIT PUT"

  // Handle Bullish Signal -> Wants Long CE
  if (signalType === "BUY CALL") {
    if (!activeTrade) {
      // Clean entry
      const newTrade = await openPaperPosition({
        strategyId: signal.strategyId,
        signalId: signal._id,
        spotPrice: spotPrice || signal.candleClose,
        optionType: "CE",
        settings,
      });
      return { executed: true, action: "OPEN_CE", trade: newTrade };
    }

    if (activeTrade.optionType === "CE") {
      // Already long CE -> No duplicate entry
      return { executed: false, action: "ALREADY_LONG_CE", tradeId: activeTrade.tradeId };
    }

    if (activeTrade.optionType === "PE") {
      // Opposite Reversal: Close PE and Open CE
      const reversal = await reversePaperPosition({
        currentTrade: activeTrade,
        signalId: signal._id,
        spotPrice: spotPrice || signal.candleClose,
        newOptionType: "CE",
        settings,
      });
      return { executed: true, action: "REVERSAL_TO_CE", ...reversal };
    }
  }

  // Handle Bearish Signal -> Wants Long PE (SELL signal means BUY PE)
  if (signalType === "BUY PUT") {
    if (!activeTrade) {
      // Clean entry
      const newTrade = await openPaperPosition({
        strategyId: signal.strategyId,
        signalId: signal._id,
        spotPrice: spotPrice || signal.candleClose,
        optionType: "PE",
        settings,
      });
      return { executed: true, action: "OPEN_PE", trade: newTrade };
    }

    if (activeTrade.optionType === "PE") {
      // Already long PE -> No duplicate entry
      return { executed: false, action: "ALREADY_LONG_PE", tradeId: activeTrade.tradeId };
    }

    if (activeTrade.optionType === "CE") {
      // Opposite Reversal: Close CE and Open PE
      const reversal = await reversePaperPosition({
        currentTrade: activeTrade,
        signalId: signal._id,
        spotPrice: spotPrice || signal.candleClose,
        newOptionType: "PE",
        settings,
      });
      return { executed: true, action: "REVERSAL_TO_PE", ...reversal };
    }
  }

  // Handle Strategy Exits
  if (signalType === "EXIT CALL") {
    if (activeTrade && activeTrade.optionType === "CE") {
      const closed = await closePaperPosition({
        tradeId: activeTrade.tradeId,
        exitReason: "STRATEGY_EXIT",
        spotPrice: spotPrice || signal.candleClose,
        settings,
      });
      return { executed: true, action: "EXIT_CE", trade: closed };
    }
    return { executed: false, reason: "No matching open CE position for EXIT CALL" };
  }

  if (signalType === "EXIT PUT") {
    if (activeTrade && activeTrade.optionType === "PE") {
      const closed = await closePaperPosition({
        tradeId: activeTrade.tradeId,
        exitReason: "STRATEGY_EXIT",
        spotPrice: spotPrice || signal.candleClose,
        settings,
      });
      return { executed: true, action: "EXIT_PE", trade: closed };
    }
    return { executed: false, reason: "No matching open PE position for EXIT PUT" };
  }

  return { executed: false, reason: "Unhandled signal condition" };
}

/**
 * Retrieves aggregate summary metrics for the paper trading dashboard
 * @param {string | object} [strategyId=null]
 * @returns {Promise<object>}
 */
export async function getPaperTradingSummary(strategyId = null) {
  await connectToDatabase();
  const settings = await getOrCreatePaperSettings(strategyId);
  const targetStratId = settings.strategyId;

  // Active open position
  let openTrade = await PaperTrade.findOne({ strategyId: targetStratId, status: "OPEN" });

  // Update live valuation if open
  if (openTrade) {
    openTrade = await updatePositionMarketValuation(openTrade, null, settings);
  }

  // Aggregate closed trades
  const closedTrades = await PaperTrade.find({
    strategyId: targetStratId,
    status: { $in: ["CLOSED", "EXPIRED"] },
  }).lean();

  const totalTrades = closedTrades.length;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalRealizedGrossPnl = 0;
  let totalEstimatedCharges = 0;
  let totalRealizedNetPnl = 0;

  for (const t of closedTrades) {
    const net = t.netPnl != null ? t.netPnl : 0;
    const gross = t.grossPnl != null ? t.grossPnl : 0;
    const charges = t.estimatedCharges != null ? t.estimatedCharges : 0;

    totalRealizedGrossPnl += gross;
    totalEstimatedCharges += charges;
    totalRealizedNetPnl += net;

    if (net > 0) {
      winningTrades++;
    } else if (net < 0) {
      losingTrades++;
    }
  }

  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;
  const currentUnrealizedPnl = openTrade?.unrealizedPnl || 0;
  const totalCombinedNetPnl = Number((totalRealizedNetPnl + currentUnrealizedPnl).toFixed(2));

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    totalRealizedGrossPnl: Number(totalRealizedGrossPnl.toFixed(2)),
    totalEstimatedCharges: Number(totalEstimatedCharges.toFixed(2)),
    totalRealizedNetPnl: Number(totalRealizedNetPnl.toFixed(2)),
    currentUnrealizedPnl: Number(currentUnrealizedPnl.toFixed(2)),
    totalCombinedNetPnl,
    openPositionsCount: openTrade ? 1 : 0,
    openPosition: openTrade ? openTrade.toObject ? openTrade.toObject() : openTrade : null,
    settings,
  };
}

/**
 * Retrieves paginated and filtered historical paper trades
 */
export async function getPaperTradesList({
  strategyId = null,
  limit = 20,
  page = 1,
  optionType,
  status,
  outcome,
  fromDate,
  toDate,
} = {}) {
  await connectToDatabase();
  const settings = await getOrCreatePaperSettings(strategyId);
  const targetStratId = settings.strategyId;

  const query = { strategyId: targetStratId };

  if (optionType && ["CE", "PE"].includes(optionType.toUpperCase())) {
    query.optionType = optionType.toUpperCase();
  }

  if (status && ["OPEN", "CLOSED", "EXPIRED", "FAILED"].includes(status.toUpperCase())) {
    query.status = status.toUpperCase();
  }

  if (outcome === "WINNING") {
    query.netPnl = { $gt: 0 };
    query.status = { $in: ["CLOSED", "EXPIRED"] };
  } else if (outcome === "LOSING") {
    query.netPnl = { $lt: 0 };
    query.status = { $in: ["CLOSED", "EXPIRED"] };
  }

  if (fromDate || toDate) {
    query.entryTimestamp = {};
    if (fromDate) query.entryTimestamp.$gte = new Date(fromDate);
    if (toDate) query.entryTimestamp.$lte = new Date(toDate);
  }

  const skip = (page - 1) * limit;

  const [trades, total] = await Promise.all([
    PaperTrade.find(query).sort({ entryTimestamp: -1 }).skip(skip).limit(limit).lean(),
    PaperTrade.countDocuments(query),
  ]);

  return {
    trades,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Aggregates daily P&L performance for charts
 */
export async function getDailyPnlData({ strategyId = null, days = 30 } = {}) {
  await connectToDatabase();
  const settings = await getOrCreatePaperSettings(strategyId);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const closedTrades = await PaperTrade.find({
    strategyId: settings.strategyId,
    status: { $in: ["CLOSED", "EXPIRED"] },
    exitTimestamp: { $gte: startDate },
  })
    .sort({ exitTimestamp: 1 })
    .lean();

  const dailyMap = new Map();

  for (const t of closedTrades) {
    const dayKey = getIstDateString(t.exitTimestamp);
    const existing = dailyMap.get(dayKey) || {
      date: dayKey,
      tradesCount: 0,
      grossPnl: 0,
      charges: 0,
      netPnl: 0,
    };

    existing.tradesCount += 1;
    existing.grossPnl = Number((existing.grossPnl + (t.grossPnl || 0)).toFixed(2));
    existing.charges = Number((existing.charges + (t.estimatedCharges || 0)).toFixed(2));
    existing.netPnl = Number((existing.netPnl + (t.netPnl || 0)).toFixed(2));

    dailyMap.set(dayKey, existing);
  }

  return Array.from(dailyMap.values());
}

/**
 * Aggregates monthly performance analytics
 */
export async function getMonthlyPnlData({ strategyId = null, year, month } = {}) {
  await connectToDatabase();
  const settings = await getOrCreatePaperSettings(strategyId);

  const now = new Date();
  const selectedYear = Number(year) || now.getFullYear();
  const selectedMonth = Number(month) != null ? Number(month) : now.getMonth() + 1; // 1-12

  // Start & End of Month in IST
  const startOfMonth = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0));

  const trades = await PaperTrade.find({
    strategyId: settings.strategyId,
    status: { $in: ["CLOSED", "EXPIRED"] },
    exitTimestamp: { $gte: startOfMonth, $lt: endOfMonth },
  })
    .sort({ exitTimestamp: 1 })
    .lean();

  let winningTrades = 0;
  let losingTrades = 0;
  let totalGross = 0;
  let totalCharges = 0;
  let totalNet = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;

  const dateMap = new Map();

  for (const t of trades) {
    const net = t.netPnl || 0;
    const gross = t.grossPnl || 0;
    const charges = t.estimatedCharges || 0;

    totalGross += gross;
    totalCharges += charges;
    totalNet += net;

    if (net > 0) {
      winningTrades++;
      totalWinAmount += net;
    } else if (net < 0) {
      losingTrades++;
      totalLossAmount += Math.abs(net);
    }

    const dayKey = getIstDateString(t.exitTimestamp);
    const dayEntry = dateMap.get(dayKey) || {
      date: dayKey,
      tradesCount: 0,
      winningCount: 0,
      losingCount: 0,
      grossPnl: 0,
      charges: 0,
      netPnl: 0,
    };

    dayEntry.tradesCount += 1;
    if (net > 0) dayEntry.winningCount += 1;
    if (net < 0) dayEntry.losingCount += 1;
    dayEntry.grossPnl = Number((dayEntry.grossPnl + gross).toFixed(2));
    dayEntry.charges = Number((dayEntry.charges + charges).toFixed(2));
    dayEntry.netPnl = Number((dayEntry.netPnl + net).toFixed(2));
    dateMap.set(dayKey, dayEntry);
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;
  const avgWinner = winningTrades > 0 ? Number((totalWinAmount / winningTrades).toFixed(2)) : 0;
  const avgLoser = losingTrades > 0 ? Number((totalLossAmount / losingTrades).toFixed(2)) : 0;

  return {
    year: selectedYear,
    month: selectedMonth,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    avgWinner,
    avgLoser,
    totalGrossPnl: Number(totalGross.toFixed(2)),
    totalCharges: Number(totalCharges.toFixed(2)),
    totalNetPnl: Number(totalNet.toFixed(2)),
    dailyBreakdown: Array.from(dateMap.values()),
  };
}
