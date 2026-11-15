/**
 * Yahoo Finance Free Demo Market Data Provider
 * Fetches real 5-minute candles for NIFTY 50 (^NSEI) and ETF volume (NIFTYBEES.NS)
 */

const NIFTY_SPOT_SYMBOL = "^NSEI";
const NIFTY_ETF_SYMBOL = "NIFTYBEES.NS";
const NIFTY_INSTRUMENT_TOKEN = 256265; // Standard NSE NIFTY token reference

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/**
 * Fetch latest live quote for NIFTY 50 spot
 * @returns {Promise<{ symbol: string, price: number, change: number, changePercent: number, high: number, low: number, open: number, previousClose: number, timestamp: string }>}
 */
export async function getYahooQuote() {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(NIFTY_SPOT_SYMBOL)}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 10 },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance API quote returned HTTP ${res.status}`);
  }

  const data = await res.json();
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
 * @param {string} range - "1d", "5d", etc.
 * @returns {Promise<Array<object>>}
 */
export async function getYahoo5MinCandles(range = "5d") {
  // Fetch NIFTY 50 spot candles
  const spotUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(NIFTY_SPOT_SYMBOL)}?interval=5m&range=${range}`;

  // Fetch NIFTYBEES for authentic ETF traded volume
  const etfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(NIFTY_ETF_SYMBOL)}?interval=5m&range=${range}`;

  const [spotRes, etfRes] = await Promise.allSettled([
    fetch(spotUrl, { headers: { "User-Agent": USER_AGENT } }),
    fetch(etfUrl, { headers: { "User-Agent": USER_AGENT } }),
  ]);

  if (spotRes.status !== "fulfilled" || !spotRes.value.ok) {
    throw new Error("Failed to fetch NIFTY 50 candles from Yahoo Finance");
  }

  const spotData = await spotRes.value.json();
  const spotResult = spotData.chart?.result?.[0];

  if (!spotResult || !spotResult.timestamp || !spotResult.indicators?.quote?.[0]) {
    throw new Error("No candle data returned from Yahoo Finance for NIFTY 50");
  }

  // Parse ETF volume map by timestamp
  const volumeByTimestamp = new Map();
  if (etfRes.status === "fulfilled" && etfRes.value.ok) {
    try {
      const etfData = await etfRes.value.json();
      const etfResult = etfData.chart?.result?.[0];
      const etfTimestamps = etfResult?.timestamp || [];
      const etfVolumes = etfResult?.indicators?.quote?.[0]?.volume || [];

      for (let i = 0; i < etfTimestamps.length; i++) {
        const ts = etfTimestamps[i];
        const vol = etfVolumes[i];
        if (vol && vol > 0) {
          volumeByTimestamp.set(ts, vol);
        }
      }
    } catch {
      // Continue with default volume calculation if ETF parsing fails
    }
  }

  const timestamps = spotResult.timestamp;
  const quote = spotResult.indicators.quote[0];
  const candles = [];

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
    // Use NIFTYBEES volume if available, or generate proportional synthetic volume based on candle volatility
    let volume = volumeByTimestamp.get(ts) || quote.volume?.[i] || 0;
    if (volume === 0) {
      const spread = Math.max(Math.abs(h - l), 1);
      volume = Math.round(spread * 5000 + 25000); // Realistic volume proxy for VWAP demo
    }

    candles.push({
      instrumentToken: NIFTY_INSTRUMENT_TOKEN,
      tradingSymbol: "NIFTY 50",
      timeframe: "5minute",
      candleTimestamp: new Date(ts * 1000),
      open: Number(o.toFixed(2)),
      high: Number(h.toFixed(2)),
      low: Number(l.toFixed(2)),
      close: Number(c.toFixed(2)),
      volume: Math.round(volume),
      source: "yahoo",
    });
  }

  return candles;
}

