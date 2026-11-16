/**
 * Zerodha Kite Connect Market Data Provider
 */

import { getActiveKiteAccessToken, KITE_API_BASE_URL } from "@/lib/kite/client";
import { normalizeTo5MinBoundary, isCandleCompleted } from "../candle-validation";

/**
 * Fetch historical 5-minute candles via Kite Connect API
 * @param {number} instrumentToken
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {Promise<Array<object>>}
 */
export async function getKite5MinCandles(instrumentToken, fromDate, toDate) {
  const accessToken = await getActiveKiteAccessToken();
  const apiKey = process.env.KITE_API_KEY;

  if (!accessToken || !apiKey) {
    throw new Error("Kite Connect authentication missing or expired");
  }

  const fromStr = typeof fromDate === "string" ? fromDate.slice(0, 10) : fromDate.toISOString().slice(0, 10);
  const toStr = typeof toDate === "string" ? toDate.slice(0, 10) : toDate.toISOString().slice(0, 10);
  const url = `${KITE_API_BASE_URL}/instruments/historical/${instrumentToken}/5minute?from=${fromStr}&to=${toStr}`;

  const res = await fetch(url, {
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${apiKey}:${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Kite historical API returned status ${res.status}`);
  }

  const data = await res.json();
  const rawCandles = data.data?.candles || [];
  const now = Date.now();
  const candleMap = new Map();

  for (const [timestampStr, o, h, l, c, v] of rawCandles) {
    const candleDate = normalizeTo5MinBoundary(new Date(timestampStr));
    if (!candleDate) continue;

    // Filter out forming / in-progress candle
    if (!isCandleCompleted(candleDate, now)) {
      continue;
    }

    const timeKey = candleDate.getTime();
    candleMap.set(timeKey, {
      instrumentToken,
      tradingSymbol: "NIFTY FUTURES",
      timeframe: "5minute",
      candleTimestamp: candleDate,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
      source: "kite",
    });
  }

  const candles = Array.from(candleMap.values());
  candles.sort((a, b) => a.candleTimestamp.getTime() - b.candleTimestamp.getTime());
  return candles;
}

