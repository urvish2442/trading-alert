/**
 * Zerodha Kite Connect Market Data Provider
 */

import { getActiveKiteAccessToken, KITE_API_BASE_URL } from "@/lib/kite/client";

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

  const fromStr = fromDate.toISOString().slice(0, 10);
  const toStr = toDate.toISOString().slice(0, 10);
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

  return rawCandles.map(([timestampStr, o, h, l, c, v]) => ({
    instrumentToken,
    tradingSymbol: "NIFTY FUTURES",
    timeframe: "5minute",
    candleTimestamp: new Date(timestampStr),
    open: o,
    high: h,
    low: l,
    close: c,
    volume: v,
    source: "kite",
  }));
}

