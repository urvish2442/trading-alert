# ANTIGRAVITY PROJECT RULES
# NIFTY 50 VWAP + EMA INTRADAY BUY/SELL ALERT PWA

## 1. YOUR ROLE

Act as a senior full-stack developer, Next.js architect, MongoDB database engineer, financial market data engineer, technical analyst, cybersecurity engineer, and QA engineer.

Build a production-structured, mobile-friendly Progressive Web Application (PWA) for monitoring NIFTY 50 and generating intraday BUY and SELL alerts using a VWAP + EMA strategy, complete with an automated NIFTY Options Paper Trading simulation engine.

The owner is a single user who wants to monitor NIFTY 50 during working hours without continuously watching the trading terminal, and wants to evaluate how the strategy performs when buying NIFTY CE and PE options through simulated paper execution.

The owner will manually decide whether to place any actual real-money trade.

You must build the application incrementally, test every feature, and explain important implementation decisions.

Do not build the entire application in one uncontrolled operation.

Work milestone by milestone.

## 2. CORE PROJECT OBJECTIVE

Create a personal NIFTY 50 intraday alert and paper-trading application with:

- NIFTY 50 market monitoring.
- Five-minute candle analysis.
- VWAP indicator.
- EMA 9 indicator.
- EMA 20 indicator.
- Automatic BUY and SELL signal generation.
- Automated NIFTY Options Paper Trading engine:
  - Automatic simulation of NIFTY options buying upon confirmed strategy signals.
  - Dynamic In-The-Money (ITM) strike selection (default 100 points ITM).
  - Dynamic current-week expiry contract resolution via Kite Connect instrument master.
  - Real option premium retrieval and fill simulation (Ask/Bid or LTP).
  - Single-position state management, automatic opposite-signal reversal, and optional neutral exit.
  - Realistic P&L accounting (gross, estimated charges, net realized & unrealized P&L).
  - Dedicated Paper Trading dashboard with open position tracking, trade history, and monthly performance analytics.
- PWA installation support.
- Push notifications when the application is in the background.
- Signal history.
- Interactive candlestick charts.
- Strategy configuration.
- Dual Market Data Provider architecture: Initial free demo mode using Yahoo Finance API, with production-ready Zerodha Kite Connect integration when purchased.
- MongoDB Atlas database.
- Vercel deployment.

The application must only generate alerts and simulate paper trades.

NEVER place orders automatically with a broker.

NEVER implement automated buying, selling, order placement, modification, cancellation, or execution on live broker accounts.

Paper trading must be completely isolated from real broker trading and must have zero access to broker order-placement endpoints.

## 3. FIXED TECHNOLOGY STACK

Use the following technology stack unless a genuine technical limitation requires a change.

### Frontend

- Next.js App Router.
- React.
- JavaScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- Lightweight Charts for financial charts.
- React Hook Form where forms are required.
- Zod for form and data validation.

### Backend

Use Next.js Route Handlers.

All backend operations must be implemented inside the same Next.js project.

DO NOT create a separate Express application.

DO NOT create a separate Node.js backend repository.

DO NOT create a persistent Socket.IO server.

Use Node.js runtime for backend routes that need the MongoDB driver, Kite SDK, cryptographic operations, or Web Push.

Do not use Edge Runtime for those routes.

### Database

- MongoDB Atlas Free cluster.
- Official MongoDB Node.js driver OR Mongoose.
- Prefer Mongoose for structured models and validation.
- Use MongoDB indexes carefully.
- Use reusable MongoDB connection management.

Do not introduce PostgreSQL, Prisma, MySQL, Firebase, or Supabase.

### Deployment

- Vercel Hobby initially.
- MongoDB Atlas Free.
- External scheduler for five-minute processing.
- Web Push API with VAPID keys.
- GitHub repository for source control.

Keep the application deployable on Vercel.

## 4. IMPORTANT VERCEL ARCHITECTURE RESTRICTIONS

This project must respect serverless execution.

Vercel Functions are not persistent servers.

Therefore:

1. Do not create an always-running process.
2. Do not use node-cron as the production scheduler.
3. Do not use setInterval or setTimeout as a background job mechanism.
4. Do not create a permanently running Kite WebSocket connection.
5. Do not implement Socket.IO server functionality.
6. Do not depend on in-memory variables for persistent state.
7. Do not assume one function invocation shares memory with another.
8. Do not assume a function will remain alive after returning its response.
9. Do not depend on local filesystem persistence.
10. Do not use an infinite loop to monitor the market.

Instead, implement stateless and independently executable API endpoints.

### Market-processing architecture

An external scheduler will call a protected Next.js API endpoint every five minutes during the trading session.

Example endpoint:

GET /api/cron/process-market

The endpoint will:

1. Verify the scheduler authentication secret.
2. Check whether the Indian market should currently be active.
3. Check whether Zerodha authentication is valid.
4. Fetch the latest completed five-minute historical candle.
5. Validate the candle timestamp and OHLCV data.
6. Check whether that candle has already been processed.
7. Save the candle if it is new.
8. Calculate VWAP, EMA 9 and EMA 20.
9. Evaluate the strategy.
10. Save any newly generated signal.
11. Dispatch a Web Push notification if a new signal was created.
12. If Paper Trading is enabled:
    - Update current option premium and unrealized P&L for any active open position.
    - Check expiry safety cutoff for open positions.
    - If a new signal or exit condition occurred, process simulated position exit, reversal, or new entry.
13. Update market-processing status.
14. Return a structured execution result.

The endpoint must finish within the deployed Vercel function's allowed execution duration.

Do not assume Vercel Hobby Cron supports five-minute scheduling. Keep scheduling independent of the application so that the external scheduler can be replaced later.

Make the scheduler interval configurable.

Suggested initial interval: five minutes.

Important: the scheduler can be delayed or fail. The system must not assume that a scheduled invocation always happens exactly on time.

### Idempotency

A scheduler may call the endpoint more than once.

The same candle must never generate duplicate signals or duplicate paper trades.

Use database uniqueness constraints and idempotent processing.

A duplicate request must return a safe response without sending another notification or opening duplicate simulated positions.

## 5. PROJECT STRUCTURE

Use a single Next.js repository.

Suggested structure:

trading-alert/
│
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.jsx
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.jsx
│   │   ├── signals/
│   │   │   └── page.jsx
│   │   ├── charts/
│   │   │   └── page.jsx
│   │   ├── paper-trading/
│   │   │   └── page.jsx
│   │   ├── strategy/
│   │   │   └── page.jsx
│   │   ├── notifications/
│   │   │   └── page.jsx
│   │   ├── settings/
│   │   │   └── page.jsx
│   │   └── layout.jsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   ├── kite/
│   │   ├── market/
│   │   ├── indicators/
│   │   ├── signals/
│   │   ├── paper-trading/
│   │   │   ├── summary/
│   │   │   ├── trades/
│   │   │   ├── trades/[id]/
│   │   │   ├── open-position/
│   │   │   ├── daily-pnl/
│   │   │   ├── monthly-pnl/
│   │   │   ├── settings/
│   │   │   ├── exit/
│   │   │   └── process/
│   │   ├── strategies/
│   │   ├── notifications/
│   │   ├── cron/
│   │   └── health/
│   │
│   ├── layout.jsx
│   ├── page.jsx
│   └── globals.css
│
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── charts/
│   ├── signals/
│   ├── paper-trading/
│   │   ├── PaperSummaryCards.jsx
│   │   ├── OpenPositionCard.jsx
│   │   ├── TradeHistoryTable.jsx
│   │   ├── MonthlyPnlView.jsx
│   │   ├── DailyPnlChart.jsx
│   │   └── PaperSettingsDialog.jsx
│   ├── strategy/
│   ├── notifications/
│   ├── settings/
│   ├── pwa/
│   └── ui/
│
├── lib/
│   ├── mongodb/
│   │   ├── connection.js
│   │   └── models/
│   │       ├── User.js
│   │       ├── BrokerSession.js
│   │       ├── Instrument.js
│   │       ├── Candle.js
│   │       ├── Indicator.js
│   │       ├── Strategy.js
│   │       ├── StrategyState.js
│   │       ├── Signal.js
│   │       ├── PaperTrade.js
│   │       ├── PaperTradingSettings.js
│   │       ├── PushSubscription.js
│   │       ├── NotificationLog.js
│   │       └── SystemLog.js
│   │
│   ├── kite/
│   │   ├── client.js
│   │   ├── authentication.js
│   │   ├── instruments.js
│   │   ├── historical-data.js
│   │   └── quotes.js
│   │
│   ├── market/
│   │   ├── market-calendar.js
│   │   ├── market-session.js
│   │   ├── candle-service.js
│   │   └── candle-validation.js
│   │
│   ├── indicators/
│   │   ├── ema.js
│   │   ├── vwap.js
│   │   └── indicator-engine.js
│   │
│   ├── strategy/
│   │   ├── strategy-rules.js
│   │   ├── signal-engine.js
│   │   └── strategy-state.js
│   │
│   ├── paper-trading/
│   │   ├── contract-resolver.js
│   │   ├── strike-selector.js
│   │   ├── expiry-resolver.js
│   │   ├── premium-service.js
│   │   ├── position-manager.js
│   │   ├── pnl-engine.js
│   │   └── paper-trading-service.js
│   │
│   ├── notifications/
│   │   ├── web-push.js
│   │   └── notification-service.js
│   │
│   ├── auth/
│   ├── security/
│   ├── validation/
│   ├── utils/
│   └── constants/
│
├── hooks/
│   ├── use-pwa.js
│   └── use-paper-trading.js
├── services/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│
├── tests/
│   ├── indicators/
│   ├── strategy/
│   ├── paper-trading/
│   ├── market/
│   └── api/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── STRATEGY.md
│   ├── PAPER_TRADING.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── .gitignore
├── vercel.json
├── package.json
├── jsconfig.json
└── README.md

You may modify this structure when necessary, but keep clear separation between frontend, API handlers, market services, indicator calculations, strategy logic, and paper trading services.

## 6. USER AUTHENTICATION

This is a single-user private application.

Do not implement public registration or multi-user signup.

Implement:

- Login screen.
- Secure session management.
- Logout.
- Protected dashboard routes.
- Protected API endpoints.
- Secure password hashing using Argon2id or bcrypt.
- Secure cookie settings.
- CSRF protection where applicable.
- Login rate limiting.

Provide a safe first-time admin setup procedure.

Do not hardcode the owner's password.

Do not expose authentication secrets to frontend JavaScript.

## 7. MARKET DATA INTEGRATION: YAHOO FINANCE DEMO PROVIDER & ZERODHA KITE CONNECT

The application supports a dual-provider architecture configured via `MARKET_DATA_PROVIDER` (`yahoo` | `kite`):

### 1. Yahoo Finance Demo Provider (Free / Zero-Cost Testing)
For initial demo, verification, and testing without requiring paid Kite Connect API subscriptions:
- Fetches real 5-minute historical candles for NIFTY 50 (`^NSEI`).
- Supports `NIFTYBEES.NS` ETF volume for realistic volume-weighted VWAP calculations.
- Requires no API keys or paid credentials.
- Allows immediate end-to-end testing of 5-minute candle analysis, indicator calculation, strategy signals, and push alerts.
- In demo mode, option quote fetching for paper trading can run in dry-run/mock simulation mode or indicate that live Kite credentials are required for true real-time institutional option contracts.

### 2. Zerodha Kite Connect Integration (Production)
When the user purchases the official Kite Connect API:
- Switch `MARKET_DATA_PROVIDER=kite` in `.env.local`.
- Uses official Kite Connect API and supported Node.js SDK.
- Documentation: https://kite.trade/docs/connect/v3/
- Fetch current-month NIFTY futures contract dynamically for true institutional volume.
- Fetch active NIFTY options instruments and live quotes (`LTP`, `depth` for bid/ask) for accurate paper-trading premium simulation.
- The candle ingestion pipeline, storage schema, indicator calculation, strategy engine, and paper-trading engine remain completely provider-agnostic.

The application needs:

- API key.
- API secret.
- Login URL.
- Request token callback.
- Access token creation.
- Session status.
- Instrument master.
- Historical candle data.
- Quote information for options and underlying.

### Authentication flow

1. User clicks Connect Zerodha.
2. Backend generates the Kite login URL.
3. User authenticates with Zerodha.
4. Zerodha redirects to the callback URL.
5. Backend receives the request_token.
6. Backend exchanges it for an access token using the official checksum process.
7. Store the session securely.
8. Display connection status.

Do not assume Kite access tokens can be refreshed silently.

Handle daily authentication expiry.

Display a clear reconnect message when the token expires.

Do not expose the API secret or access token to the browser.

Use server-side environment variables for API credentials.

Encrypt sensitive stored credentials using an application encryption key.

Do not log API secrets, access tokens, or request tokens.

### Market instrument selection

The user wants NIFTY 50 monitoring.

Important technical distinction:

NIFTY spot is an index and does not have conventional traded volume for a meaningful volume-weighted VWAP calculation.

Therefore:

- Display NIFTY 50 spot price as the main reference price.
- Use the current-month NIFTY futures instrument for VWAP and EMA calculations by default.
- Fetch the current futures instrument dynamically from the Kite instrument master.
- Never hardcode a changing futures instrument token.
- Store the instrument token, trading symbol, expiry, and exchange.
- Handle futures contract rollover.
- Do not combine candles from different futures contracts in one VWAP calculation.
- Reset session VWAP at the start of a new trading session.
- Clearly label the dashboard so the user knows when indicators are calculated from NIFTY futures rather than spot.

Make the calculation instrument configurable in the future.

Do not silently switch between spot and futures.

## 8. MARKET DATA AND CANDLE MANAGEMENT

Use Kite historical candle data as the initial data source.

The production design must not require a permanently connected WebSocket.

Timeframe: five minutes.

Market timezone: Asia/Kolkata.

Normal market session:

09:15 IST to 15:30 IST.

Use an exchange calendar and account for:

- Weekends.
- Exchange holidays.
- Special trading sessions.
- Muhurat trading.
- Session changes announced by the exchange.

Never assume every weekday is a trading day.

### Candle rules

Store:

- Instrument token.
- Trading symbol.
- Exchange.
- Interval.
- Candle start timestamp.
- Open.
- High.
- Low.
- Close.
- Volume.
- Data source.
- Creation timestamp.

Use UTC for database timestamps.

Convert to Asia/Kolkata for display and market calculations.

Do not treat an unfinished five-minute candle as completed.

Process only candles whose interval has closed.

Validate:

- High is greater than or equal to open and close.
- Low is less than or equal to open and close.
- High is greater than or equal to low.
- Volume is non-negative.
- Timestamp is valid.
- Instrument matches the configured calculation instrument.

If data is missing or invalid, do not generate a signal.

### Historical warm-up

Fetch sufficient historical five-minute candles before enabling the strategy.

Use enough historical data to calculate EMA 20 reliably.

Use additional warm-up candles for stable EMA initialization.

Do not generate a signal until all required indicators are available.

When historical data is incomplete, show an indicator warm-up status.

### Recovery

If the scheduler misses one or more runs:

1. Determine the last successfully processed candle.
2. Fetch missing historical candles.
3. Validate them.
4. Process missing candles in chronological order.
5. Apply signal-state rules.
6. Avoid generating delayed notifications as if they were live signals.
7. Update the system's recovery status.

Never skip missing candles silently.

## 9. TRADING INDICATORS

Implement the following indicators accurately.

### EMA 9

Period: 9.

Formula:

alpha = 2 / (period + 1)

EMA = (close × alpha) + (previous EMA × (1 - alpha))

### EMA 20

Period: 20.

Use the same EMA formula with period 20.

Use completed five-minute closing prices.

### Session VWAP

Use:

Typical Price = (High + Low + Close) / 3

VWAP = Sum(Typical Price × Volume) / Sum(Volume)

Use futures candle volume.

Reset VWAP for each new market session.

Never calculate a conventional VWAP using NIFTY spot index volume.

Handle zero cumulative volume safely.

### Indicator engine

Create pure, testable JavaScript functions.

The calculation engine must:

- Accept candle data.
- Calculate EMA 9.
- Calculate EMA 20.
- Calculate session VWAP.
- Return a structured indicator snapshot.
- Reject insufficient or invalid data.
- Produce deterministic results.

Do not mix UI code with indicator calculations.

Do not calculate indicators independently in multiple components.

There must be one trusted calculation engine.

## 10. ACTIVE TRADING STRATEGY: NIFTY OPTION BUYER - VWAP EMA9 REVERSAL STRATEGY

Implement this exact strategy based on the Pine Script v6 indicator ("NIFTY Option Buyer - VWAP EMA9 Reversal Strategy"):

### Indicators
1. **EMA 9**: 9-period Exponential Moving Average on Close.
2. **Session VWAP**: Volume-Weighted Average Price on HLC3 (`(High + Low + Close) / 3`).

### Crossovers / Crossunders (5-Minute Completed Candle)
- `vwapDown`: `ta.crossunder(close, vwapValue)` (Close crosses below VWAP)
- `vwapUp`: `ta.crossover(close, vwapValue)` (Close crosses above VWAP)
- `emaUp`: `ta.crossover(close, ema9)` (Close crosses above EMA 9)
- `emaDown`: `ta.crossunder(close, ema9)` (Close crosses below EMA 9)

### State Machine
- `state = 0`: No active trade (FLAT)
- `state = 1`: PUT active
- `state = 2`: CALL active

### Signals and Transitions
On each confirmed completed 5-minute candle:

1. **When state == 0 (No active trade)**:
   - If `vwapDown`: Generate **BUY PUT** alert, transition `state = 1`.
   - Else if `vwapUp`: Generate **BUY CALL** alert, transition `state = 2`.

2. **When state == 1 (PUT active - Bearish trend)**:
   - If `vwapUp and close > ema9`: Generate **BUY CALL** alert, transition `state = 2` (Reversal).
   - Else if `emaUp`: Generate **EXIT PUT** alert, transition `state = 0` (Exit to Flat).

3. **When state == 2 (CALL active - Bullish trend)**:
   - If `vwapDown and close < ema9`: Generate **BUY PUT** alert, transition `state = 1` (Reversal).
   - Else if `emaDown`: Generate **EXIT CALL** alert, transition `state = 0` (Exit to Flat).

### Stored Signals
Every signal stores:
- Signal ID
- Strategy ID
- Instrument
- Signal Type: `BUY CALL` | `BUY PUT` | `EXIT CALL` | `EXIT PUT`
- Timeframe: `5minute`
- Candle timestamp
- Candle close
- VWAP
- EMA 9
- Previous State & New State
- Creation timestamp

Make signal evaluation deterministic.

### Signal record

Every signal should store:

- Signal ID.
- Strategy ID.
- Instrument.
- Calculation instrument.
- Signal type: BUY or SELL.
- Timeframe.
- Candle timestamp.
- Candle close.
- VWAP.
- EMA 9.
- EMA 20.
- Previous direction.
- Current direction.
- Strategy configuration version.
- Creation timestamp.
- Notification status.

Use a unique database index based on the strategy, instrument, candle timestamp, and signal type.

---

## 11. NIFTY OPTIONS PAPER TRADING MODULE

### 11.1 Objective & Architectural Isolation

Add a paper-trading module that automatically simulates NIFTY options buying whenever the existing VWAP + EMA strategy generates BUY or SELL signals.

The module simulates actual option premium entries, live tracking, and exits using real Kite Connect market data.

**Absolute Architectural Isolation:**
- The application must **NEVER place actual real orders** with a broker.
- Paper trading must be completely isolated from real broker trading and must have **zero access** to broker order-placement or order-modification endpoints.
- The module is strictly designed to evaluate how the strategy performs when buying NIFTY CE and PE options under live market conditions.

### 11.2 Core Trading & Signal Mapping Logic

Use the existing confirmed NIFTY 50 strategy signals as inputs:

1. **When the strategy generates a BUY signal (Bullish)**:
   - Interpret as a bullish directional event.
   - Select a NIFTY CE (Call Option) contract.
   - Select the current week's expiry.
   - Select an option strike 100 points In-The-Money (ITM).
   - Fetch the actual option premium using Kite Connect.
   - Open a simulated BUY position.
   - Store all entry details in MongoDB.

2. **When the strategy generates a SELL signal (Bearish)**:
   - Interpret as a bearish directional event.
   - Select a NIFTY PE (Put Option) contract.
   - Select the current week's expiry.
   - Select an option strike 100 points In-The-Money (ITM).
   - Fetch the actual option premium using Kite Connect.
   - Open a simulated BUY position in the PE contract.
   - Store all entry details in MongoDB.

**CRITICAL RULE:**
- **SELL signal means BUY PE.**
- It does **NOT** mean selling an option or creating a naked short position.
- The paper-trading module supports **option buying only** (long CE or long PE). Option writing / shorting is strictly prohibited.

### 11.3 Dynamic ITM Strike Selection

Implement dynamic, mathematically robust ITM strike selection:

- **Reference Price:** Use the live NIFTY 50 spot price at the time of signal confirmation.
- **ATM Calculation:** Dynamically determine the nearest At-The-Money (ATM) strike using the actual strike interval available from the Kite instrument master (typically 50 points for NIFTY):
  `ATM Strike = Math.round(Spot Price / Strike Interval) * Strike Interval`
- **In-The-Money (ITM) Offset:**
  - **For CE (Call Option):** Strike must be **below ATM** (lower strike = ITM for Call):
    `Selected CE Strike = ATM Strike - ITM Distance`
  - **For PE (Put Option):** Strike must be **above ATM** (higher strike = ITM for Put):
    `Selected PE Strike = ATM Strike + ITM Distance`
- **Configurability:**
  - Make ITM distance configurable in paper-trading settings, with **100 points** as the default.
  - Do not hardcode strike intervals. Validate against actual available strikes in the instrument master.
  - Display the selected contract trading symbol and strike clearly on the dashboard.

*Example (assuming 50-point strike interval and 100-point ITM distance):*
- Spot: 26,240 &rarr; ATM = 26,250
- BUY Signal (Bullish): Buy **26,150 CE** (26,250 - 100)
- SELL Signal (Bearish): Buy **26,350 PE** (26,250 + 100)

### 11.4 Current-Week Expiry Selection & Expiry Safety Cutoff

Select the nearest eligible weekly NIFTY expiry dynamically:

- **Dynamic Master Query:** Query the Kite instrument master for active `NIFTY` options (`OPTIDX` / `NFO`).
- **Nearest Eligible Expiry:**
  - Filter for active expiry dates greater than or equal to current date in `Asia/Kolkata`.
  - Sort chronologically and select the earliest available expiry (the current weekly expiry).
  - Do not hardcode expiry dates or assume a fixed day of the week (e.g. Thursday), as exchange holidays or NSE schedule changes alter expiry days.
- **Contract Verification:**
  Always verify that the resolved contract contains:
  1. Valid `instrumentToken`.
  2. Exact `tradingSymbol` (e.g., `NIFTY26FEB26150CE`).
  3. Valid `expiry` date.
  4. Matching `strikePrice` and `instrumentType` (`CE` or `PE`).
  5. Active lot size from the exchange.
- **Availability Safeguard:**
  - If the required contract is unavailable in the master or delisted, **do not create a paper trade**.
  - Log the failure reason to `systemLogs` and display an alert on the UI.
- **Expiry-Day Safety Cutoff:**
  - Implement a configurable expiry safety rule (default enabled).
  - Close any open paper position before the option's expiry-day market close (e.g. at 15:15 IST on expiry day) using a valid available market quote.
  - **Never allow an expired option to remain indefinitely marked as a live open position.**

### 11.5 Option Premium Entry & Fill Simulation

After a valid strategy signal is confirmed:

1. Resolve the correct option contract from the instrument master.
2. Fetch the current option quote from the Kite Connect Quote/LTP API.
3. Validate that the quote is non-empty, contains positive price data, and is not stale (timestamp within `quoteFreshnessLimit`).
4. Verify that the Indian market session is active.
5. Apply the configured **Fill-Price Method**:
   - `ask_bid` (Recommended Default): Use the Best Ask (Offer) price for simulated BUY entry; use Best Bid price for simulated exits.
   - `ltp`: Use Last Traded Price if depth data is unavailable or selected by configuration.
   - Always record the `fillMethod` used (`ASK`, `BID`, or `LTP`).
6. Create the simulated entry record with actual option premium, contract details, and execution timestamps.
7. Save the entry transaction in MongoDB.

**Strict Realism Rules:**
- **Never invent or fabricate an option premium.**
- **Never use the underlying NIFTY index price as the option premium.**
- If the quote is missing, invalid, or stale, do not open a trade. Log the failure.
- Store `quoteTimestamp` (timestamp from the exchange quote) and `entryTimestamp` (simulation timestamp) separately.

### 11.6 Position Management & Single-Position Constraint

Initially support **only ONE active paper position at a time**:

- The system must prevent multiple simultaneous open positions under the same strategy and account.
- Each paper trade record maintains:
  - `tradeId` (Unique UUID / timestamp-based ID)
  - `signalId` (Reference to triggering signal)
  - `instrumentToken`, `tradingSymbol`, `optionType`, `strikePrice`, `expiryDate`
  - `entryPremium`, `entryTimestamp`, `entrySpotPrice`, `entryFillMethod`
  - `lotSize`, `numberOfLots`, `totalQuantity` (`totalQuantity = lotSize * numberOfLots`)
  - `currentPremium`, `currentPremiumTimestamp`, `unrealizedPnl`
  - `exitPremium`, `exitTimestamp`, `exitReason`, `exitFillMethod`, `realizedPnl`
  - `grossPnl`, `estimatedCharges`, `netPnl`, `returnPercentage`
  - `status`: `OPEN` | `CLOSED` | `EXPIRED` | `FAILED`
- **Position Integrity Constraints:**
  - Do not open a new position when an existing position is `OPEN` unless the existing position has been successfully closed.
  - Never average down.
  - Never increase an existing position automatically.
  - Never pyramid positions.

### 11.7 Exit and Reversal Logic

Implement explicit, decoupled exit management:

#### Scenario A: Opposite Signal Reversal
- If a **CE position is OPEN** and strategy generates **SELL**:
  1. Fetch current CE quote (Bid price / LTP).
  2. Close the existing CE position, compute realized P&L, set status to `CLOSED`, and save exit record.
  3. Dynamically resolve the new 100-pt ITM PE contract.
  4. Fetch current PE quote (Ask price / LTP).
  5. Open the new simulated PE position and save record.
- If a **PE position is OPEN** and strategy generates **BUY**:
  1. Fetch current PE quote (Bid price / LTP).
  2. Close the existing PE position, compute realized P&L, set status to `CLOSED`, and save exit record.
  3. Dynamically resolve the new 100-pt ITM CE contract.
  4. Fetch current CE quote (Ask price / LTP).
  5. Open the new simulated CE position and save record.

**Decoupled Operation Reliability:**
- The old position must be **successfully closed and committed to the database** before opening the new one.
- If the exit succeeds but the new entry fails (e.g. PE quote unavailable), preserve the closed trade cleanly and record the entry failure. Never pretend both succeeded.
- Use MongoDB transactions or idempotent sequential writes.

#### Scenario B: Explicit Strategy EXIT Signal
- If the strategy generates an explicit `EXIT PUT` or `EXIT CALL`:
  - Close the active paper position using current market quote.
  - Set `exitReason = "STRATEGY_EXIT"`.
  - Do not open a new position (return to `FLAT` state).

#### Scenario C: Neutral Strategy Direction
- Add a configurable setting in `paperTradingSettings`:
  `exitOnNeutral: boolean` (Default: `false`).
- When `exitOnNeutral === true`: A transition from BUY or SELL to NEUTRAL generates an EXIT event and closes the open position.
- When `exitOnNeutral === false`: A neutral state does not automatically close an open position; the trade remains open until an opposite signal, explicit exit, or expiry cutoff occurs.
- Expose this setting clearly in both Strategy and Paper Trading settings UI.

#### Scenario D: No Open Position
- If an EXIT event arrives when no position is open, ignore it safely without creating an invalid trade record.

### 11.8 P&L & Charges Calculation Engine

Calculate actual option-premium profit and loss:

- **Gross P&L Formula:**
  - For an `OPEN` position (Unrealized Gross P&L):
    `Unrealized Gross P&L = (Current Premium - Entry Premium) * Total Quantity`
  - For a `CLOSED` position (Realized Gross P&L):
    `Realized Gross P&L = (Exit Premium - Entry Premium) * Total Quantity`
- **Estimated Transaction Charges:**
  - Support configurable estimated transaction charges (brokerage, STT, exchange turnover fees, GST, stamp duty) per lot or flat per trade.
  - Default: `0` (clean gross tracking initially, with field ready for cost estimation).
  - Formula: `Net P&L = Gross P&L - Estimated Charges`
  - Percentage Return: `returnPercentage = ((Exit Premium - Entry Premium) / Entry Premium) * 100`
- **Dynamic Lot Sizing:**
  - Fetch official `lotSize` dynamically from Kite instrument master (e.g. 75, 50, or 25 as mandated by NSE). Never hardcode the NIFTY lot size.
  - Number of lots configurable by user (`numberOfLots`, default: `1`).
  - `totalQuantity = lotSize * numberOfLots`.
  - Store `entryQuantity`, `lotSize`, and `numberOfLots` immutably on the trade record so future exchange lot size changes never corrupt historical trades.

### 11.9 Live Position Monitoring in Serverless Architecture

Position monitoring must respect Vercel's serverless environment:

- **No Persistent Process:** Do not create permanent background watchers or websockets.
- **Scheduled Synchronization:** Integrate option position monitoring into the protected 5-minute scheduler endpoint (`/api/cron/process-market`):
  1. Check if there is an active `OPEN` paper position.
  2. If open, fetch the latest option quote from Kite Connect.
  3. Validate quote freshness (`now - quoteTimestamp <= quoteFreshnessLimit`).
  4. Update `currentPremium`, `currentPremiumTimestamp`, and `unrealizedPnl`.
  5. Check if current time is past expiry cutoff (close position if expiry reached).
  6. Save updated trade state to MongoDB.
- **Freshness Indicator:** If a quote cannot be updated, display a visible "STALE QUOTE" indicator and do not report stale prices as live.

### 11.10 Paper-Trading Settings & Manual Exit

Configurable parameters in `paperTradingSettings`:
- `enabled`: boolean (master switch).
- `underlying`: `NIFTY 50`.
- `expirySelection`: `CURRENT_WEEK`.
- `itmDistance`: number in points (default: `100`).
- `numberOfLots`: number (default: `1`).
- `fillMethod`: `ASK_BID` | `LTP` (default: `ASK_BID`).
- `exitOnNeutral`: boolean (default: `false`).
- `estimatedCharges`: number per trade (default: `0`).
- `quoteFreshnessLimit`: number in seconds (default: `60`).

**Manual Paper Exit:**
- Provide a "Manual Exit" button on the UI for emergency simulated closure.
- Closes the simulated position in MongoDB using the latest available market quote.
- **Prohibition:** Manual paper exit must only update MongoDB; it must NEVER invoke real broker order APIs.
- Disabling paper trading stops new simulated entries but preserves existing open positions until closed manually or by signal.

### 11.11 Data Validation & Safety Guarantees

Never create or close a paper trade when:
1. Kite authentication is expired or invalid.
2. Target option contract cannot be resolved from instrument master.
3. Expiry date is in the past or contract is expired.
4. Strike price is unavailable.
5. Option quote is missing, zero, or stale.
6. Market session is closed or holiday.
7. Lot size is invalid or zero.
8. MongoDB write fails.

**Historical Warm-Up Isolation:**
- Do not create paper trades from historical warm-up candles.
- Only newly confirmed live completed 5-minute candles processed during active market hours can trigger paper-trade entries.
- Maintain an immutable audit log in `systemLogs` for every entry, exit, reversal, and rejection.

---

## 12. NOTIFICATIONS

Use the Web Push API and a service worker.

Generate VAPID keys.

Keep private VAPID keys on the server.

Implement:

- Subscribe device.
- Store push subscription.
- Unsubscribe device.
- Send BUY notification.
- Send SELL notification.
- Send PAPER TRADE ENTRY & EXIT notifications (optional configuration).
- Notification history.
- Notification error logging.
- Expired subscription cleanup.

Notification examples:

BUY ALERT

NIFTY 50
Direction: BUY
Timeframe: 5 Minutes
Close: [value]
VWAP: [value]
EMA 9: [value]
EMA 20: [value]
Time: [IST timestamp]

SELL ALERT

NIFTY 50
Direction: SELL
Timeframe: 5 Minutes
Close: [value]
VWAP: [value]
EMA 9: [value]
EMA 20: [value]
Time: [IST timestamp]

Only send notifications for newly saved signals.

Do not send notifications for duplicate signals.

Handle notification failures separately from signal creation.

A push failure must not delete or invalidate a saved signal or paper trade.

The PWA must work when installed on supported mobile devices.

For iOS, explain that push notifications require an eligible iOS version, Home Screen installation, and user permission.

Do not promise that push delivery is instantaneous.

Show the notification permission status in the application.

## 13. DASHBOARD DESIGN

Create a premium dark trading terminal.

The interface should be clean, modern, responsive, and professional.

Avoid excessive visual clutter.

Use a desktop sidebar and mobile-friendly navigation.

### Main dashboard

Display:

1. NIFTY 50 spot price.
2. NIFTY futures price.
3. Current market status.
4. Last market-data update time.
5. Zerodha connection status.
6. Strategy status.
7. Latest signal.
8. Active Paper Trading position banner (if active).
9. EMA 9.
10. EMA 20.
11. VWAP.
12. Current directional bias.
13. Five-minute chart.
14. Recent signal history.

### Market status

Possible states:

- MARKET CLOSED.
- MARKET OPEN.
- WAITING FOR DATA.
- CONNECTING.
- KITE AUTHENTICATION REQUIRED.
- DATA STALE.
- PROCESSING.
- SYSTEM ERROR.

Never show a normal healthy status if the latest market data is stale.

### Signal display

Use clear BUY and SELL visual indicators.

Do not show fake or sample signals in production.

Clearly label simulated/test data.

### Chart

Use Lightweight Charts.

Display:

- Candlesticks.
- VWAP.
- EMA 9.
- EMA 20.
- BUY markers.
- SELL markers.

Use five-minute candles.

Allow the user to inspect historical candles.

Chart data must come from the backend API.

Do not calculate a different set of indicators in the chart component.

## 14. APPLICATION PAGES

Build these pages:

### Dashboard

Main market-monitoring page.

### Signals

Show historical BUY and SELL signals.

Include filters for:

- Date.
- BUY.
- SELL.
- Instrument.

### Charts

Show historical candlestick charts with indicators and signals.

### Paper Trading (`/paper-trading`)

Dedicated NIFTY options paper trading simulation page:

1. **Summary Cards:**
   - Total Trades.
   - Winning Trades vs Losing Trades.
   - Win Rate (%).
   - Total Realized P&L.
   - Current Unrealized P&L.
   - Total Net P&L (after estimated charges).
   - Open Positions Count (`0` or `1`).

2. **Open Position Section:**
   - Active contract card displaying:
     - Direction & Option Type (`BUY CE` or `BUY PE`).
     - Trading Symbol (e.g., `NIFTY26FEB26150CE`).
     - Strike Price & Expiry Date.
     - Entry Premium, Current Premium, and Entry Timestamp.
     - Live Unrealized P&L (amount & % return).
     - Quote freshness indicator & timestamp.
     - Action: Manual Paper Exit button.

3. **Trade History Table:**
   - Paginated, filterable table with columns:
     - Date & Entry Time.
     - Exit Time.
     - Direction / Option Type (`CE` / `PE`).
     - Strike & Expiry.
     - Entry Premium & Exit Premium.
     - Quantity & Lots.
     - Gross P&L, Estimated Charges, Net P&L.
     - Return (%).
     - Status (`CLOSED`, `EXPIRED`, `FAILED`).
     - Exit Reason (`OPPOSITE_SIGNAL`, `STRATEGY_EXIT`, `MANUAL_EXIT`, `EXPIRY_CUTOFF`).
   - Filters: Date Range, Option Type (`CE`/`PE`), Outcome (`Winning`/`Losing`), Status.

4. **Monthly Performance Analytics:**
   - Month & Year selector.
   - Monthly Realized Gross P&L, Charges, Net P&L.
   - Monthly Win Rate, Average Winner, Average Loser.
   - Daily P&L visual chart.
   - Date-wise breakdown table:
     - Date (Asia/Kolkata).
     - Trades closed count.
     - Realized P&L.
     - Open position unrealized P&L shown separately.
   - **Realized P&L accounting rule:** A trade is strictly counted in realized P&L on its **exit date**, not its entry date.

5. **Paper Trading Settings Modal:**
   - Toggle Enable/Disable.
   - ITM distance selector (default 100).
   - Number of lots selector (default 1).
   - Fill method selection (`ASK_BID` / `LTP`).
   - `exitOnNeutral` toggle.
   - Estimated charges configuration.
   - Quote freshness limit.

### Strategy

Display strategy conditions.

Allow enabling and disabling the strategy.

Allow configuration of supported parameters (including `exitOnNeutral`).

Do not allow arbitrary code execution through strategy settings.

### Notifications

Show device subscriptions, notification preferences, and permission status.

### Settings

Include:

- Zerodha connection.
- Market-data provider & status.
- Calculation instrument.
- Date Range candle resynchronization.
- PWA status.
- System status.
- Application information.

## 15. MONGODB DATABASE DESIGN

Use Mongoose models.

Create these collections:

### users

Single administrator account.

Fields:

- email
- passwordHash
- role
- createdAt
- updatedAt

### brokerSessions

Fields:

- provider
- accessTokenEncrypted
- tokenExpiry
- connected
- lastAuthenticatedAt
- updatedAt

### instruments

Fields:

- instrumentToken
- exchange
- tradingSymbol
- name
- instrumentType
- strikePrice
- expiry
- lotSize
- isActive
- updatedAt

Indexes: `instrumentToken` (unique), `tradingSymbol`, `name + instrumentType + expiry + strikePrice`.

### candles

Fields:

- instrumentToken
- tradingSymbol
- timeframe
- candleTimestamp
- open
- high
- low
- close
- volume
- source
- createdAt

Create a unique index for instrumentToken + timeframe + candleTimestamp.

### indicators

Fields:

- instrumentToken
- timeframe
- candleTimestamp
- vwap
- ema9
- ema20
- createdAt

Create an appropriate unique index.

### strategies

Fields:

- name
- enabled
- timeframe
- emaFastPeriod
- emaSlowPeriod
- calculationInstrument
- rules
- version
- createdAt
- updatedAt

### strategyStates

Fields:

- strategyId
- instrumentToken
- lastDirection
- lastProcessedCandle
- updatedAt

Create a unique index for strategyId + instrumentToken.

### signals

Fields:

- strategyId
- instrumentToken
- tradingSymbol
- signalType
- timeframe
- candleTimestamp
- candleClose
- vwap
- ema9
- ema20
- previousDirection
- strategyVersion
- createdAt

Create a unique index preventing duplicate signals.

### paperTrades

Fields:

- tradeId (String, unique)
- strategyId (ObjectId / String)
- signalId (ObjectId / String)
- underlying (String, e.g. "NIFTY 50")
- exchange (String, e.g. "NFO")
- optionSymbol (String, e.g. "NIFTY26FEB26150CE")
- instrumentToken (Number)
- optionType (String, "CE" | "PE")
- strikePrice (Number)
- expiryDate (Date)
- entryPremium (Number)
- entryTimestamp (Date)
- entrySpotPrice (Number)
- entryQuantity (Number)
- lotSize (Number)
- numberOfLots (Number)
- totalQuantity (Number)
- entryFillMethod (String, "ASK" | "BID" | "LTP")
- currentPremium (Number)
- currentPremiumTimestamp (Date)
- exitPremium (Number)
- exitTimestamp (Date)
- exitReason (String, "OPPOSITE_SIGNAL" | "STRATEGY_EXIT" | "MANUAL_EXIT" | "EXPIRY_CUTOFF")
- exitFillMethod (String, "ASK" | "BID" | "LTP")
- grossPnl (Number)
- estimatedCharges (Number)
- netPnl (Number)
- returnPercentage (Number)
- status (String, "OPEN" | "CLOSED" | "EXPIRED" | "FAILED")
- createdAt (Date)
- updatedAt (Date)

Indexes:
- `tradeId`: unique index.
- `status`: index for rapid open-position queries.
- `entryTimestamp`, `exitTimestamp`: indexes for date range and monthly performance aggregation.
- `strategyId + signalId`: index preventing duplicate trades from the same signal.
- Partial unique index: `{ strategyId: 1, status: 1 }` where `{ status: "OPEN" }` to enforce database-level guarantee of at most one OPEN position at any time.

### paperTradingSettings

Fields:

- enabled (Boolean, default: true)
- strategyId (String)
- underlying (String, default: "NIFTY 50")
- expirySelection (String, default: "CURRENT_WEEK")
- itmDistance (Number, default: 100)
- numberOfLots (Number, default: 1)
- fillMethod (String, default: "ASK_BID")
- exitOnNeutral (Boolean, default: false)
- estimatedCharges (Number, default: 0)
- quoteFreshnessLimit (Number, default: 60)
- updatedAt (Date)

### pushSubscriptions

Fields:

- endpoint
- subscription
- deviceName
- enabled
- createdAt
- updatedAt

### notificationLogs

Fields:

- signalId
- subscriptionId
- status
- errorMessage
- sentAt
- createdAt

### systemLogs

Fields:

- category
- level
- message
- metadata
- createdAt

Do not save unnecessary market data.

Do not save every tick.

Keep MongoDB storage usage visible in system documentation.

Use pagination for historical data.

Use appropriate indexes.

Avoid unbounded queries.

Do not fetch all candles, signals, or paper trades into memory.

Implement configurable historical candle retention.

Never delete signal or paper-trade history automatically without explicit configuration.

## 16. API ROUTES

Create structured REST API routes:

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

### Kite

- `GET /api/kite/login`
- `GET /api/kite/callback`
- `GET /api/kite/status`
- `POST /api/kite/disconnect`

### Market

- `GET /api/market/status`
- `GET /api/market/quote`
- `GET /api/market/candles`
- `GET /api/market/instruments`
- `POST /api/market/sync`

### Indicators

- `GET /api/indicators/current`
- `GET /api/indicators/history`

### Signals

- `GET /api/signals`
- `GET /api/signals/latest`
- `GET /api/signals/[id]`

### Paper Trading

- `GET /api/paper-trading/summary`: Returns summary statistics (total, win/loss count, win rate, realized/unrealized P&L, active position).
- `GET /api/paper-trading/trades`: Returns paginated and filtered historical paper trades.
- `GET /api/paper-trading/trades/[id]`: Returns detail of a specific paper trade.
- `GET /api/paper-trading/open-position`: Returns current active OPEN paper trade with live premium and P&L.
- `GET /api/paper-trading/daily-pnl`: Returns daily aggregated P&L data for chart rendering.
- `GET /api/paper-trading/monthly-pnl`: Returns monthly grouped analytics and date-wise performance breakdown.
- `GET /api/paper-trading/settings`: Fetches current paper-trading settings.
- `PATCH /api/paper-trading/settings`: Updates paper-trading settings with Zod validation.
- `POST /api/paper-trading/exit`: Triggers manual simulated exit for the current open paper trade.
- `POST /api/paper-trading/process`: Manually triggers paper-trading check and quote update.

### Strategies

- `GET /api/strategies`
- `POST /api/strategies`
- `PATCH /api/strategies/[id]`
- `POST /api/strategies/[id]/toggle`

### Notifications

- `POST /api/notifications/subscribe`
- `POST /api/notifications/unsubscribe`
- `GET /api/notifications/status`
- `GET /api/notifications/history`

### Scheduled processing

- `GET /api/cron/process-market`
- `POST /api/cron/process-market`

Protect the cron endpoint with a strong `CRON_SECRET`.

Do not allow public callers to execute market-processing jobs without authentication.

Validate all request parameters using Zod.

Return consistent JSON response structures.

Use proper HTTP status codes.

Never return raw exception details or secrets to the frontend.

## 17. SECURITY RULES

Security is mandatory.

1. Never expose `KITE_API_SECRET`.
2. Never expose `KITE_API_KEY` unnecessarily.
3. Never expose Kite access tokens to frontend code.
4. Never expose MongoDB connection strings.
5. Never expose VAPID private keys.
6. Never expose `CRON_SECRET`.
7. Keep environment variables server-side.
8. Use HTTPS in production.
9. Validate all API input.
10. Protect private API endpoints.
11. Validate scheduler authentication.
12. Implement rate limiting on sensitive endpoints.
13. Secure authentication cookies.
14. Encrypt sensitive stored credentials.
15. Avoid logging confidential information.
16. Use least-privilege MongoDB credentials.
17. Restrict MongoDB network access as much as the deployment allows.
18. Do not commit .env files.
19. Use .env.example with placeholder values only.
20. Keep all broker order-placement functionality out of the application.
21. Paper trading must be completely isolated from broker ordering APIs; paper exits must never trigger real-money transactions.

## 18. ENVIRONMENT VARIABLES

Create a documented .env.example.

Expected variables:

```env
MONGODB_URI=
MONGODB_DB_NAME=
KITE_API_KEY=
KITE_API_SECRET=
KITE_REDIRECT_URL=
CRON_SECRET=
APP_ENCRYPTION_KEY=
AUTH_SECRET=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
NEXT_PUBLIC_APP_URL=
MARKET_DATA_PROVIDER=yahoo
```

Do not put private values in NEXT_PUBLIC variables.

Do not invent credentials.

When a real credential is needed, explain where the user obtains it and ask the user to configure it securely.

Do not print credentials in terminal logs or generated documentation.

## 19. ERROR HANDLING AND SYSTEM RELIABILITY

Handle the following conditions:

- MongoDB unavailable.
- Kite authentication expired.
- Kite API unavailable.
- Kite API rate limit.
- Historical candle request failed.
- Missing candles.
- Invalid candles.
- Incomplete candles.
- Duplicate scheduler invocation.
- Scheduler delay.
- Push notification failed.
- Expired push subscription.
- Invalid instrument token.
- Futures expiry or rollover.
- Option instrument resolution failed.
- Option quote unavailable or stale.
- Option strike unavailable in master.
- Expiry safety close triggered.
- Opposite signal reverse entry failure (preserve closed trade).
- Market holiday.
- Market closed.
- Stale market data.

Every failure should be logged safely in `systemLogs`.

A failed market-data request must not create a signal or paper trade.

A failed indicator calculation must not create a signal.

A failed notification must not erase a signal or paper trade.

Never display stale data as live data.

## 20. TESTING REQUIREMENTS

Use Vitest for unit tests.

Use appropriate integration tests for API routes and MongoDB operations.

Test:

- EMA calculations.
- VWAP calculations.
- Daily VWAP reset.
- Candle validation.
- Completed-candle detection.
- BUY conditions.
- SELL conditions.
- Neutral conditions.
- Signal transitions.
- Duplicate signal prevention.
- Scheduler authentication.
- Authentication expiry.
- Push subscription validation.
- Missing candle recovery.
- Futures rollover handling.
- **Paper Trading Test Suite:**
  - CE ITM strike selection (100 pt below ATM).
  - PE ITM strike selection (100 pt above ATM).
  - ATM strike rounding across arbitrary spot values.
  - Dynamic strike interval handling.
  - Weekly expiry resolution from instrument master.
  - Rejection of expired option contracts.
  - Option quote validation & stale quote rejection.
  - Simulated BUY entry creation on BUY signal.
  - Simulated BUY PE entry creation on SELL signal.
  - Prevention of duplicate paper trades for the same signal.
  - Prevention of concurrent multiple OPEN positions.
  - Opposite signal position reversal (close CE &rarr; open PE, close PE &rarr; open CE).
  - Handling failed new entry after successful exit (decoupled error state).
  - Strategy EXIT signal position closure.
  - Neutral exit when `exitOnNeutral` is enabled.
  - Neutral persistence when `exitOnNeutral` is disabled.
  - Manual paper exit execution.
  - Expiry safety close before market end.
  - Gross P&L, charges, and net P&L calculations.
  - Dynamic lot sizing and quantity calculations.
  - Daily P&L aggregation.
  - Monthly P&L grouping (realized counted on exit date in Asia/Kolkata).

Create known numerical test fixtures.

Do not rely exclusively on mocked tests.

Test database indexes and duplicate prevention against a test database.

Do not claim a feature is complete until its relevant tests pass.

## 21. TRADING SAFETY AND BACKTESTING

This is an alerting and paper-trading simulation tool, not a guaranteed profitable trading system.

Do not claim that BUY or SELL signals guarantee profit.

Do not present backtest results without actual historical data and documented assumptions.

Before live use, build a backtesting module or a separate test harness.

Evaluate:

- Number of signals.
- Win rate.
- Average favorable movement.
- Average adverse movement.
- Maximum drawdown.
- Signal frequency.
- False signals.
- Slippage.
- Brokerage and transaction costs.

Define an exit methodology before calculating win rate.

Remember that a directional NIFTY signal does not guarantee that an option premium will increase.

Do not automatically translate a NIFTY directional signal into a live broker options order.

Paper trading is strictly simulated; the user makes all actual live trading decisions manually on their personal broker terminal.

## 22. PWA REQUIREMENTS

Implement:

- manifest.json with valid 192x192, 512x512, and maskable PNG icons.
- Service worker with active `fetch` event listener (mandatory for Android Chrome installability).
- Application icons.
- Installable PWA with responsive install prompts on mobile and desktop.
- Responsive mobile layout with dedicated mobile drawer navigation.
- Web Push subscription with VAPID keys.
- Notification click handling.
- Offline fallback page.

Do not cache private API responses or sensitive user information in the service worker.

Do not display outdated market information as current while offline.

Show an offline indicator.

## 23. CODING STANDARDS

Use JavaScript strict mode.

Write clean, modular JavaScript. Zero TypeScript.

Use reusable components.

Use meaningful variable and function names.

Separate UI, database access, market logic, indicators, strategy, paper trading, and notifications.

Use async/await.

Handle exceptions.

Keep functions small and focused.

Avoid duplicated code.

Use server-only modules for sensitive services.

Avoid importing server-only modules into client components.

Use dynamic imports when chart libraries require browser APIs.

Keep dependencies minimal.

Do not install unnecessary packages.

Before introducing a new dependency, explain why it is needed.

Do not modify package versions unnecessarily.

Do not use deprecated APIs.

## 24. USER INTERFACE DESIGN RULES

Design direction:

Dark trading terminal.

Use a professional financial-dashboard appearance.

Requirements:

- Clean spacing.
- Clear typography.
- Responsive cards.
- Consistent colors.
- Readable chart labels.
- Mobile-first usability.
- Good loading states.
- Good empty states.
- Error states.
- Connection status indicators.

Suggested visual semantics:

- BUY / Call / Profit: emerald green.
- SELL / Put / Loss: rose red.
- Neutral: slate grey.
- Market status: contextual badge.
- Warning/stale data: amber.

Avoid excessive animations.

Avoid decorative elements that interfere with market information.

Do not use fake prices or fake signals.

## 25. DOCUMENTATION

Maintain these documents:

- `README.md`: Explain setup, installation, development, and deployment.
- `docs/ARCHITECTURE.md`: Explain system architecture and data flow.
- `docs/DATABASE.md`: Explain MongoDB collections, models, and compound indexes.
- `docs/API.md`: Document API endpoints and request/response examples.
- `docs/STRATEGY.md`: Document exact BUY and SELL conditions.
- `docs/PAPER_TRADING.md`: Document paper trading engine, ITM strike selection, expiry resolver, P&L formulas, and lifecycle.
- `docs/DEPLOYMENT.md`: Explain Vercel and MongoDB deployment.

Update documentation whenever implementation changes.

## 26. DEVELOPMENT MILESTONES

Do not jump between milestones without completing the current one.

### MILESTONE 1: PROJECT FOUNDATION

Tasks:

- Inspect the existing repository.
- Initialize Next.js if needed.
- Configure JavaScript.
- Configure Tailwind.
- Configure shadcn/ui.
- Configure ESLint.
- Create folder structure.
- Create MongoDB connection utility.
- Create environment variable validation.
- Build login UI.
- Build dashboard layout.
- Create responsive sidebar and mobile navigation.
- Add dark theme.
- Add README and .env.example.

Deliverable:

A working Next.js application with a professional dashboard shell and MongoDB connection.

### MILESTONE 2: AUTHENTICATION AND DATABASE

Tasks:

- Implement single-user authentication.
- Implement secure session handling.
- Create MongoDB models.
- Create indexes.
- Protect dashboard routes.
- Protect backend routes.
- Add system health endpoint.

Deliverable:

A secured personal dashboard connected to MongoDB.

### MILESTONE 3: MARKET DATA INTEGRATION (YAHOO FINANCE DEMO PROVIDER + KITE READY ARCHITECTURE)

Tasks:

- Implement Yahoo Finance 5-minute historical candle service.
- Support NIFTY 50 spot (`^NSEI`) and ETF volume (`NIFTYBEES.NS`) for demo VWAP.
- Implement Kite Connect client architecture for easy switch when purchased.
- Implement candle validation (OHLC invariants, positive volume, timestamp validation).
- Implement historical candle warm-up ingestion into MongoDB `candles` collection.
- Implement market calendar / session check for Indian markets (09:15 - 15:30 IST).
- Implement market data API routes:
  - `GET /api/market/quote`
  - `GET /api/market/candles`
  - `GET /api/market/status`
- Update dashboard with live market data from the active provider.

Deliverable:

Verified five-minute historical candles fetched from Yahoo Finance (demo) stored in MongoDB, with live market quotes on the dashboard.

### MILESTONE 4: INDICATOR ENGINE

Tasks:

- Implement EMA 9.
- Implement EMA 20.
- Implement session VWAP.
- Implement indicator snapshots.
- Add numerical tests.
- Add chart data API.

Deliverable:

Correct indicator calculations with tested numerical results.

### MILESTONE 5: STRATEGY ENGINE

Tasks:

- Implement BUY conditions.
- Implement SELL conditions.
- Implement neutral conditions.
- Implement persisted strategy state.
- Implement transition detection.
- Implement duplicate prevention.
- Store signals.
- Add signal history APIs.

Deliverable:

Reliable BUY and SELL signal generation.

### MILESTONE 6: PAPER TRADING ENGINE

Tasks:

- Create paper-trading MongoDB models (`PaperTrade`, `PaperTradingSettings`).
- Create compound and partial unique indexes (guaranteeing max 1 OPEN position).
- Implement dynamic weekly expiry resolution from Kite instrument master.
- Implement dynamic ITM strike selection (100 pt default ITM distance based on spot and strike interval).
- Implement CE and PE contract selection.
- Implement option premium retrieval service (Ask/Bid and LTP fill methods).
- Implement quote freshness and market session validation.
- Implement simulated entries upon confirmed live strategy signals (BUY &rarr; Buy CE, SELL &rarr; Buy PE).
- Implement open position management and tracking.
- Implement simulated exits and opposite-signal reversal (close old position before opening new).
- Implement optional neutral exit (`exitOnNeutral` configuration).
- Implement expiry safety cutoff closing open position before expiry day close.
- Implement gross P&L, estimated charges, and net P&L calculation engine.
- Implement dynamic lot-size resolution and configurable lots.
- Implement daily and monthly P&L aggregation (realized P&L counted on exit date in Asia/Kolkata).
- Implement paper-trading API endpoints (`summary`, `trades`, `open-position`, `daily-pnl`, `monthly-pnl`, `settings`, `exit`, `process`).
- Build `/paper-trading` page with summary cards, active position banner, history table, and monthly analytics.
- Add comprehensive unit and integration tests.

Deliverable:

A reliable paper-trading engine that automatically opens, monitors, closes, and reverses simulated NIFTY option positions based on live strategy signals, with full P&L analytics and zero live-broker execution risk.

### MILESTONE 7: PWA AND NOTIFICATIONS

Tasks:

- Implement manifest.json with PNG and maskable icons.
- Implement service worker with active `fetch` handler.
- Implement installation support and responsive prompts on mobile and desktop.
- Implement VAPID key configuration.
- Implement push subscription storage.
- Implement push notification delivery for signals and paper trade events.
- Implement notification history and permissions diagnostics.
- Test mobile installation and permissions on Android Chrome and iOS Safari.

Deliverable:

An installable PWA that can receive alerts when backgrounded, subject to platform support and delivery delays.

### MILESTONE 8: SCHEDULER AND RECOVERY

Tasks:

- Implement protected market-processing endpoint (`/api/cron/process-market`).
- Implement idempotent execution.
- Implement completed-candle processing.
- Integrate paper trading position monitoring and quote updates into the scheduled run.
- Implement historical recovery without generating duplicate signals or retroactive paper trades.
- Implement stale-data detection.
- Implement market-calendar checks.
- Document external scheduler configuration.
- Test repeated and delayed invocations.

Deliverable:

A scheduled market-processing system that works reliably within serverless execution limits without a persistent backend process.

### MILESTONE 9: CHARTS AND FINAL DASHBOARD

Tasks:

- Implement candlestick chart with Lightweight Charts.
- Add VWAP, EMA 9, and EMA 20 indicators to charts.
- Add signal markers (BUY / SELL).
- Add latest signal card and active paper position quick-view banner.
- Add signal history and date-range resynchronization.
- Add market health and diagnostic indicators.
- Add responsive mobile refinements and slide-out navigation.

Deliverable:

A complete, responsive trading alert and paper-trading dashboard.

### MILESTONE 10: TESTING AND DEPLOYMENT

Tasks:

- Run all unit tests (indicators, strategy, paper trading, market calendar, security).
- Run integration tests for all API routes and MongoDB operations.
- Run security audit.
- Run ESLint and Next.js production build.
- Check Vercel deployment and verify serverless function durations.
- Configure production environment variables in Vercel.
- Configure MongoDB network access for Atlas cluster.
- Configure external scheduler cron job.
- Configure push notification permissions on production domain.
- Test live market-data processing and simulated paper trade workflow during active market hours.
- Document known limitations and operational runbook.

Deliverable:

A fully deployed, verified, and production-tested application on Vercel and MongoDB Atlas.

## 27. HOW YOU MUST WORK AS AN ANTIGRAVITY AGENT

Follow these rules throughout development.

1. First inspect the complete existing project.
2. Do not overwrite existing working files without understanding them.
3. Before coding a milestone, provide a short implementation plan.
4. Work on one milestone at a time.
5. Create files in small logical groups.
6. Explain important architectural decisions.
7. Run JavaScript checks after implementation.
8. Run ESLint.
9. Run relevant tests.
10. Run the production build when appropriate.
11. Fix errors before moving to the next milestone.
12. Do not hide errors.
13. Do not claim a feature works without testing it.
14. Do not use placeholder implementations for critical market-data, strategy, or paper-trading logic.
15. If a third-party API requires credentials, clearly explain the setup.
16. If documentation is uncertain, check official documentation rather than guessing.
17. Do not invent API endpoints, request formats, or response fields.
18. Do not silently change strategy conditions.
19. Do not silently change the calculation instrument.
20. Do not introduce automated real-order execution.
21. Keep a checklist of completed and pending tasks.
22. Update documentation as you build.
23. Preserve a working application at the end of each milestone.
24. Ask for approval before major architectural changes.
25. Do not ask the user to repeat decisions already stated in this document.

### Vibe-coding workflow

For every milestone:

A. Explain the objective.

B. List the files that will be created or changed.

C. Implement the feature.

D. Run the required checks.

E. Fix any issues.

F. Explain how to test the feature manually.

G. Update the milestone checklist.

H. Stop and wait for the user's approval before starting the next milestone.

Do not implement all ten milestones in a single response.

## 28. FINAL NON-NEGOTIABLE RULES

- One repository only.
- Next.js frontend and backend only.
- MongoDB Atlas database.
- Vercel-compatible serverless architecture.
- No Express server.
- No persistent Socket.IO server.
- No permanent Kite WebSocket listener.
- Five-minute candle analysis.
- VWAP + EMA 9 + EMA 20.
- BUY and SELL alerts only.
- Web Push notifications.
- Single-user private application.
- Dark trading dashboard.
- Automated Paper Trading simulation only; NEVER real broker order execution.
- Paper trading supports option buying only (BUY CE on bullish signal, BUY PE on bearish signal); NO option writing or shorting.
- Max ONE active open paper position at a time.
- No invented market data or premiums.
- No duplicate signals or duplicate paper trades.
- No signals from incomplete or stale candles.
- No retroactive paper trades during historical warm-up or recovery.
- No secrets in frontend code.
- No untested critical logic.

The objective is a reliable, understandable, maintainable NIFTY 50 alert and paper-trading application, not merely a visually attractive dashboard.

Start with MILESTONE 1 only.
