# NIFTY 50 VWAP + EMA Intraday Alert PWA

A personal, production-ready Progressive Web Application (PWA) for monitoring NIFTY 50 and generating intraday BUY and SELL alerts using a 5-minute VWAP + EMA 9 strategy ("NIFTY Option Buyer - VWAP EMA9 Both Trends").

> [!IMPORTANT]
> **Strict Safety Notice**: This application is strictly an **alerting and decision-support system**. It contains **NO automated trading, order placement, or execution code**. The user reviews signals and places all orders manually on their broker terminal.

---

## Technology Stack

- **Framework**: Next.js 15.5.28 (App Router, Node.js Runtime)
- **Language**: Pure JavaScript (ES2022 / React 19)
- **Styling**: Tailwind CSS &amp; shadcn/ui custom primitives
- **Financial Charting**: TradingView Lightweight Charts (v5.3.0)
- **Theme**: Professional Dark Financial Trading Terminal
- **Database**: MongoDB Atlas Free Cluster via Mongoose (with serverless connection caching)
- **Strategy**: Pine Script v6 ("NIFTY Option Buyer - VWAP EMA9 Both Trends")
- **Notifications**: Web Push API with EC VAPID signing &amp; Service Worker
- **Scheduler**: Stateless HTTP Cron (`/api/cron/process-market`) compatible with cron-job.org / GitHub Actions
- **Security**: AES-256-GCM token encryption, HMAC-SHA256 session cookies, bcrypt password hashing, Zod schema validation
- **Testing**: Vitest (62 unit, integration, and security tests)

---

## Milestone Status (All Milestones Completed)

- [x] **Milestone 1: Project Foundation &amp; Dark Trading Shell**
  - Next.js 15.5.28 App Router initialized with pure JavaScript
  - Tailwind CSS dark trading terminal palette &amp; shadcn/ui components
  - Serverless cached MongoDB connection manager
  - Responsive layout (desktop sidebar, mobile navigation, top navbar)
  - Complete architecture documentation (`docs/`)
- [x] **Milestone 2: Authentication &amp; Database Architecture**
  - Live MongoDB Atlas integration with 11 Mongoose models
  - Compound unique indexes for complete idempotency
  - Secure bcrypt password hashing &amp; Web Crypto HMAC-SHA256 session cookies
  - AES-256-GCM encryption for stored broker credentials
  - Route protection middleware (`middleware.js`)
  - Single-user setup script (`scripts/seed-admin.js`) and API (`/api/auth/setup`)
- [x] **Milestone 3: Market Data Integration (Yahoo Demo + Zerodha Kite Ready)**
  - Dual-provider architecture: Free demo via Yahoo Finance (`^NSEI` / `NIFTYBEES.NS`) and production Kite Connect
  - Strict financial OHLCV candle validation &amp; invariant verification
  - NSE India market calendar (09:15–15:30 IST, holidays, special sessions)
  - REST endpoints: `/api/market/quote`, `/api/market/candles`, `/api/market/status`, `/api/market/sync`
- [x] **Milestone 4: Indicator Engine (VWAP, EMA 9, EMA 20)**
  - Session VWAP on HLC3 with daily 09:15 IST reset and zero-volume safety
  - EMA 9 &amp; EMA 20 with standard alpha smoothing
  - Unified Indicator Engine returning deterministic snapshots
  - REST endpoints: `/api/indicators/current`, `/api/indicators/history`
- [x] **Milestone 5: Strategy Engine &amp; Signal State Management**
  - Implemented user's Pine Script v6 strategy: "NIFTY Option Buyer - VWAP EMA9 Both Trends"
  - Crossover &amp; crossunder detection (`vwapUp`, `vwapDown`, `emaUp`, `emaDown`)
  - State machine: `0 = FLAT`, `1 = PUT Active`, `2 = CALL Active`
  - Signals: `BUY CALL`, `BUY PUT`, `EXIT CALL`, `EXIT PUT`
  - Idempotent signal persistence with unique database constraints
  - REST endpoints: `/api/signals`, `/api/signals/latest`, `/api/signals/[id]`, `/api/strategies`
- [x] **Milestone 6: PWA Web Push Notifications**
  - VAPID key generation and server-side EC signing
  - Push notification formatting conforming to Section 11 specifications
  - Service worker (`public/sw.js`) with custom vibrations, tags, and click routing
  - 1-click device push subscription &amp; test alert dispatch on `/notifications`
  - Auto-cleanup of expired (HTTP 410/404) subscriptions
- [x] **Milestone 7: Scheduled Processing &amp; Historical Recovery**
  - Stateless cron endpoint (`/api/cron/process-market`) protected by `CRON_SECRET`
  - Stale data audit (>15m) and chronological backfill of missed candles
  - Suppression of stale alerts during recovery to avoid alerting fatigue
  - Execution duration under 500ms on Vercel serverless
- [x] **Milestone 8: Financial Charts &amp; Terminal Polish**
  - Interactive TradingView Lightweight Charts on `/charts` and `/dashboard`
  - Candlesticks with overlays: VWAP (amber), EMA 9 (cyan), EMA 20 (sky blue)
  - Visual signal markers (`BUY CALL`, `BUY PUT`, `EXIT CALL`, `EXIT PUT`)
  - Crosshair legend with IST timestamp, OHLC, VWAP, EMA 9, EMA 20
  - Indicator toggles and bar range filters (75m, 150m, 300m)
- [x] **Milestone 9: End-to-End Verification &amp; Production Deployment**
  - 62 Vitest unit, security, and end-to-end integration tests passing 100%
  - Security audit verifying AES-256-GCM encryption, bcrypt hashing, HMAC sessions, and Zero Order Execution
  - Clean production build with 0 ESLint warnings/errors
  - Comprehensive deployment documentation (`docs/DEPLOYMENT.md`)

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 2. Environment Setup
Copy `.env.example` to `.env.local` and set your credentials:
```bash
cp .env.example .env.local
```

### 3. Run Test Suite
```bash
npm test
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## Production Deployment Checklist

1. **Database**: Create MongoDB Atlas free cluster, whitelist `0.0.0.0/0` in Network Access.
2. **Vercel**: Import repository into Vercel and configure Environment Variables from `.env.example`.
3. **Admin User**: Seed your administrator account via `node scripts/seed-admin.js <email> <password>`.
4. **Scheduler**: Set up a free 5-minute cron job at [cron-job.org](https://cron-job.org) pointing to `https://your-domain.vercel.app/api/cron/process-market` with `Authorization: Bearer <CRON_SECRET>`.
5. **Mobile PWA**: Open on iPhone (Safari &rarr; Add to Home Screen) or Android (Chrome &rarr; Install App) and enable Web Push notifications.

For detailed instructions, consult [`docs/DEPLOYMENT.md`](file:///Volumes/Projects/Urvish/trading-alert/docs/DEPLOYMENT.md).

---

## Documentation Index

- [System Architecture](file:///Volumes/Projects/Urvish/trading-alert/docs/ARCHITECTURE.md)
- [Production Deployment Guide](file:///Volumes/Projects/Urvish/trading-alert/docs/DEPLOYMENT.md)
- [REST API Reference](file:///Volumes/Projects/Urvish/trading-alert/docs/API.md)
- [Database Schema &amp; Indexes](file:///Volumes/Projects/Urvish/trading-alert/docs/DATABASE.md)
- [Strategy Specification (Pine Script v6)](file:///Volumes/Projects/Urvish/trading-alert/docs/STRATEGY.md)
- [Scheduler &amp; Recovery Setup](file:///Volumes/Projects/Urvish/trading-alert/docs/SCHEDULER.md)
- [Web Push &amp; PWA Guide](file:///Volumes/Projects/Urvish/trading-alert/docs/NOTIFICATIONS.md)
