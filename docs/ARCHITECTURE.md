# System Architecture: NIFTY 50 Intraday Alert PWA

## 1. High-Level Architecture Overview

The system is built as a unified, modern, serverless-ready Progressive Web Application (PWA) on Next.js 15 App Router, hosted on Vercel with MongoDB Atlas for persistent storage.

```
                           ┌───────────────────────────────────────────┐
                           │          External Web Cron                │
                           │   (cron-job.org / GitHub Actions)         │
                           │   Pings /api/cron/process-market q5m      │
                           └─────────────────────┬─────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────┐           ┌──────────────────────┐           ┌────────────────────────┐
│     Next.js Frontend    │           │  Next.js API Routes  │           │   Market Data Service  │
│  - Dark Trading UI      │◄─────────►│  - /api/auth/*       │◄─────────►│  - Yahoo Finance (Demo)│
│  - Lightweight Charts   │ (Session) │  - /api/market/*     │  (Quotes/ │  - Kite Connect (Prod) │
│  - Service Worker (sw)  │           │  - /api/signals/*    │   Candles)│  - Candle Validation   │
│  - Web Push Receiver    │           │  - /api/cron/*       │           └────────────────────────┘
└─────────────────────────┘           └──────────┬───────────┘
                                                 │
                                                 ▼
                           ┌───────────────────────────────────────────┐
                           │               Indicator Engine            │
                           │  - Session VWAP on HLC3                   │
                           │  - EMA 9 on 5m Close                      │
                           │  - EMA 20 on 5m Close                     │
                           └─────────────────────┬─────────────────────┘
                                                 │
                                                 ▼
                           ┌───────────────────────────────────────────┐
                           │            Strategy State Engine          │
                           │  - Option Buyer: VWAP EMA9 Both Trends    │
                           │  - Crossover / Crossunder Detection       │
                           │  - State Machine: 0:FLAT, 1:PUT, 2:CALL   │
                           │  - Signals: BUY CALL/PUT, EXIT CALL/PUT   │
                           └─────────────────────┬─────────────────────┘
                                                 │
                                                 ▼
                           ┌───────────────────────────────────────────┐
                           │            Web Push Dispatcher            │
                           │  - VAPID EC Signing (web-push)            │
                           │  - Parallel Push to Active Subscriptions  │
                           │  - Stale 410/404 Subscription Auto-Clean  │
                           └─────────────────────┬─────────────────────┘
                                                 │
                                                 ▼
                           ┌───────────────────────────────────────────┐
                           │            MongoDB Atlas Cluster          │
                           │  - 11 Mongoose Models                     │
                           │  - Compound Unique Idempotency Indexes    │
                           │  - Reusable Connection Pooling            │
                           └───────────────────────────────────────────┘
```

---

## 2. Serverless Execution Constraints & Solutions

| Challenge in Serverless | Antigravity Solution |
| :--- | :--- |
| **No persistent process** | Stateless Next.js route handlers triggered by external cron (`/api/cron/process-market`). |
| **Execution time limit** | Pipeline completes in 200–500ms; zero long polling or persistent WebSockets. |
| **Duplicate scheduler calls** | Compound unique indexes on `[strategyId, instrumentToken, candleTimestamp, signalType]` guarantee complete idempotency. |
| **Missed runs / outages** | Recovery engine audits gap between last processed candle and current market time, sequentially processing missed intervals without blasting delayed push notifications. |
| **Connection limits** | Mongoose cached connection pooling (`global.mongooseConn`) prevents connection exhaustion during serverless warm restarts. |

---

## 3. Core Modules

### 1. Market Data Pipeline (`lib/market/`)
- **`providers/yahoo.js`**: Free, high-fidelity 5m candle ingestion for `^NSEI` and `NIFTYBEES.NS`.
- **`providers/kite.js`**: Production Zerodha Kite Connect integration for institutional futures volume.
- **`candle-validation.js`**: Enforces strict financial invariants:
  - $High \ge \max(Open, Close)$
  - $Low \le \min(Open, Close)$
  - $High \ge Low$
  - $Volume \ge 0$
- **`market-calendar.js`**: Exchange calendar for NSE India (09:15–15:30 IST, weekday checks, national holidays, special sessions).
- **`recovery-service.js`**: Missed candle backfill and audit recovery.

### 2. Indicator Calculation Engine (`lib/indicators/`)
- **Session VWAP**:
  $$\text{Typical Price} = \frac{\text{High} + \text{Low} + \text{Close}}{3}$$
  $$\text{VWAP} = \frac{\sum (\text{Typical Price} \times \text{Volume})}{\sum \text{Volume}}$$
  Resets at 09:15 IST daily. Zero cumulative volume handled safely.
- **EMA 9 & EMA 20**:
  $$\alpha = \frac{2}{period + 1}$$
  $$\text{EMA}_t = (\text{Close}_t \times \alpha) + (\text{EMA}_{t-1} \times (1 - \alpha))$$
  Initial seed uses SMA over the first `period` bars.

### 3. Strategy State Machine (`lib/strategy/`)
Implements Pine Script v6 "NIFTY Option Buyer - VWAP EMA9 Both Trends":
- State 0 (FLAT):
  - `vwapDown` $\rightarrow$ `BUY PUT` (state 1)
  - `vwapUp` $\rightarrow$ `BUY CALL` (state 2)
- State 1 (PUT Active):
  - `vwapUp && !emaUp` $\rightarrow$ `BUY CALL` (state 2 reversal)
  - `emaUp` $\rightarrow$ `EXIT PUT` (state 0 exit)
- State 2 (CALL Active):
  - `vwapDown && !emaDown` $\rightarrow$ `BUY PUT` (state 1 reversal)
  - `emaDown` $\rightarrow$ `EXIT CALL` (state 0 exit)

### 4. Push Notification Service (`lib/notifications/`)
- Web Push API with VAPID key signing.
- Payload includes trade direction, exact entry price, VWAP, EMA 9, and formatted IST timestamp.
- Auto-deletes expired (HTTP 410 / 404) subscriptions.

### 5. Financial Charting (`components/charts/`)
- Powered by TradingView **Lightweight Charts v5.3.0**.
- Renders candlesticks, VWAP overlay (amber), EMA 9 overlay (cyan), EMA 20 overlay (sky blue), and signal markers (`BUY CALL`, `BUY PUT`, `EXIT CALL`, `EXIT PUT`).
- Crosshair legend with IST date, OHLC, VWAP, EMA 9, EMA 20.
