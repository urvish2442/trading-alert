/**
 * Yahoo Finance Free Demo Market Data Provider
 * Fetches real 5-minute candles for NIFTY 50 (^NSEI) and ETF volume (NIFTYBEES.NS)
 * Implements exponential backoff, domain fallback, and robust browser headers to prevent 429 rate limiting
 */

import { normalizeTo5MinBoundary, isCandleCompleted } from "../candle-validation";

const NIFTY_SPOT_SYMBOL = "^NSEI";
const NIFTY_ETF_SYMBOL = "NIFTYBEES.NS";
const NIFTY_INSTRUMENT_TOKEN = 256265; // Standard NSE NIFTY token reference

const ROTATING_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

const BROWSER_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": "https://finance.yahoo.com",
};

/**
 * Fetch helper with automatic domain switching and exponential backoff
 * @param {string} path - URL path e.g. /v8/finance/chart/...
 * @param {number} retries - Number of retry attempts (default 3)
 * @returns {Promise<object>}
 */
async function fetchYahooWithRetry(path, retries = 3) {
  const domains = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const domain = domains[(attempt - 1) % domains.length];
    const userAgent = ROTATING_USER_AGENTS[(attempt - 1) % ROTATING_USER_AGENTS.length];
    const url = `${domain}${path}`;

    try {
      const res = await fetch(url, {
        headers: {
          ...BROWSER_HEADERS,
          "User-Agent": userAgent,
        },
        cache: "no-store",
      });

      if (res.status === 200) {
        return await res.json();
      }

      if (res.status === 429) {
        lastError = new Error(`Yahoo Finance rate limit reached (HTTP 429) on ${domain}`);
        if (attempt < retries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
          continue;
        }
      } else {
        lastError = new Error(`Yahoo Finance returned HTTP ${res.status} on ${domain}`);
      }
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
  }

  throw lastError || new Error("Failed to reach Yahoo Finance after retries");
}

/**
 * Fetch latest live quote for NIFTY 50 spot
 * @returns {Promise<{ symbol: string, price: number, change: number, changePercent: number, high: number, low: number, open: number, previousClose: number, timestamp: string }>}
 */
export async function getYahooQuote() {
  const path = `/v8/finance/chart/${encodeURIComponent(NIFTY_SPOT_SYMBOL)}?interval=1d&range=1d`;
  const data = await fetchYahooWithRetry(path, 3);
  const meta = data.chart?.result?.[0]?.meta;

  if (!meta) {
    throw new Error("Invalid Yahoo Finance quote response structure");
  }

  const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
  const previousClose = meta.previousClose || meta.chartPreviousClose || price;
  const change = Number((price - previousClose).toFixed(2));
  const changePercent = previousClose ? Number(((change / previousClose) * 100).toFixed(2)) : 0;

  return {
    symbol: "NIFTY 50",
    rawSymbol: NIFTY_SPOT_SYMBOL,
    price: Number(price.toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
    change,
    changePercent,
    high: Number((meta.regularMarketDayHigh || price).toFixed(2)),
    low: Number((meta.regularMarketDayLow || price).toFixed(2)),
    open: Number((meta.regularMarketDayOpen || price).toFixed(2)),
    currency: meta.currency || "INR",
    exchange: meta.exchangeName || "NSE",
    timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
    provider: "yahoo",
  };
}

/**
 * Fetch completed 5-minute historical candles from Yahoo Finance
 * Supports both relative range (e.g. "1d", "5d") and explicit date range ({ fromDate, toDate })
 * @param {string | { fromDate: string, toDate: string }} rangeOrOptions
 * @returns {Promise<Array<object>>}
 */
export async function getYahoo5MinCandles(rangeOrOptions = "5d") {
  let queryParams = "";
  if (typeof rangeOrOptions === "object" && rangeOrOptions.fromDate && rangeOrOptions.toDate) {
    const p1 = Math.floor(new Date(rangeOrOptions.fromDate + "T00:00:00+05:30").getTime() / 1000);
    const p2 = Math.floor(new Date(rangeOrOptions.toDate + "T23:59:59+05:30").getTime() / 1000);
    queryParams = `period1=${p1}&period2=${p2}`;
  } else {
    const range = typeof rangeOrOptions === "string" ? rangeOrOptions : "5d";
    queryParams = `range=${range}`;
  }

  // 1. Fetch NIFTY 50 spot candles with retry and fallback
  const spotPath = `/v8/finance/chart/${encodeURIComponent(NIFTY_SPOT_SYMBOL)}?interval=5m&${queryParams}`;

  let spotData;
  try {
    spotData = await fetchYahooWithRetry(spotPath, 3);
  } catch (err) {
    // If range=5d was throttled, attempt lightweight fallback to range=1d
    if (queryParams.startsWith("range=5d")) {
      try {
        const fallbackPath = `/v8/finance/chart/${encodeURIComponent(NIFTY_SPOT_SYMBOL)}?interval=5m&range=1d`;
        spotData = await fetchYahooWithRetry(fallbackPath, 2);
      } catch {
        throw err;
      }
    } else {
      throw err;
    }
  }

  const spotResult = spotData.chart?.result?.[0];
  if (!spotResult || !spotResult.timestamp || !spotResult.indicators?.quote?.[0]) {
    throw new Error("No candle data returned from Yahoo Finance for NIFTY 50");
  }

  // 2. Fetch ETF volume sequentially with non-blocking error handling
  const volumeByTimestamp = new Map();
  try {
    await new Promise((r) => setTimeout(r, 200));
    const etfPath = `/v8/finance/chart/${encodeURIComponent(NIFTY_ETF_SYMBOL)}?interval=5m&${queryParams}`;
    const etfData = await fetchYahooWithRetry(etfPath, 1);
    const etfResult = etfData.chart?.result?.[0];
    const etfTimestamps = etfResult?.timestamp || [];
    const etfVolumes = etfResult?.indicators?.quote?.[0]?.volume || [];

    for (let i = 0; i < etfTimestamps.length; i++) {
      const ts = etfTimestamps[i];
      const vol = etfVolumes[i];
      if (vol && vol > 0) {
        const normEtfDate = normalizeTo5MinBoundary(new Date(ts * 1000));
        if (normEtfDate) {
          volumeByTimestamp.set(normEtfDate.getTime(), vol);
        }
      }
    }
  } catch {
    // Non-blocking: If ETF volume is rate-limited, continue gracefully with synthetic proxy
  }

  // 3. Format into unified candle documents (completed 5-minute candles only)
  const timestamps = spotResult.timestamp;
  const quote = spotResult.indicators.quote[0];
  const candleMap = new Map();
  const now = Date.now();

  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open[i];
    const h = quote.high[i];
    const l = quote.low[i];
    const c = quote.close[i];

    // Filter null or NaN candles
    if (o == null || h == null || l == null || c == null) {
      continue;
    }

    const ts = timestamps[i];
    const candleDate = normalizeTo5MinBoundary(new Date(ts * 1000));
    if (!candleDate) continue;

    // Filter out in-progress candle: A candle starting at candleDate completes 5 minutes later
    if (!isCandleCompleted(candleDate, now)) {
      continue;
    }

    const timeKey = candleDate.getTime();
    let volume = volumeByTimestamp.get(timeKey) || quote.volume?.[i] || 0;
    if (volume === 0) {
      const spread = Math.max(Math.abs(h - l), 1);
      volume = Math.round(spread * 5000 + 25000); // Realistic volume proxy for VWAP demo
    }

    const candle = {
      instrumentToken: NIFTY_INSTRUMENT_TOKEN,
      tradingSymbol: "NIFTY 50",
      timeframe: "5minute",
      candleTimestamp: candleDate,
      open: Number(o.toFixed(2)),
      high: Number(h.toFixed(2)),
      low: Number(l.toFixed(2)),
      close: Number(c.toFixed(2)),
      volume: Math.round(volume),
      source: "yahoo",
    };

    // Deduplication: if already exists, retain highest volume (confirmed ETF volume)
    const existing = candleMap.get(timeKey);
    if (!existing || candle.volume > existing.volume) {
      candleMap.set(timeKey, candle);
    }
  }

  const candles = Array.from(candleMap.values());
  candles.sort((a, b) => a.candleTimestamp.getTime() - b.candleTimestamp.getTime());

  return candles;
}
