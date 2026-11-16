# ANTIGRAVITY PROJECT RULES
# NIFTY 50 VWAP + EMA INTRADAY BUY/SELL ALERT PWA

## 1. YOUR ROLE

Act as a senior full-stack developer, Next.js architect, MongoDB database engineer, financial market data engineer, technical analyst, cybersecurity engineer, and QA engineer.

Build a production-structured, mobile-friendly Progressive Web Application (PWA) for monitoring NIFTY 50 and generating intraday BUY and SELL alerts using a VWAP + EMA strategy.

The owner is a single user who wants to monitor NIFTY 50 during working hours without continuously watching the trading terminal.

The owner will manually decide whether to place any trade.

You must build the application incrementally, test every feature, and explain important implementation decisions.

Do not build the entire application in one uncontrolled operation.

Work milestone by milestone.

## 2. CORE PROJECT OBJECTIVE

Create a personal NIFTY 50 intraday alert application with:

- NIFTY 50 market monitoring.
- Five-minute candle analysis.
- VWAP indicator.
- EMA 9 indicator.
- EMA 20 indicator.
- Automatic BUY and SELL signal generation.
- PWA installation support.
- Push notifications when the application is in the background.
- Signal history.
- Interactive candlestick charts.
- Strategy configuration.
- Dual Market Data Provider architecture: Initial free demo mode using Yahoo Finance API, with production-ready Zerodha Kite Connect integration when purchased.
- MongoDB Atlas database.
- Vercel deployment.

The application must only generate alerts.

NEVER place orders automatically.

NEVER implement automated buying, selling, order placement, modification, cancellation, or execution.

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
11. Dispatch a Web Push notification.
12. Update market-processing status.
13. Return a structured execution result.

The endpoint must finish within the deployed Vercel function's allowed execution duration.

Do not assume Vercel Hobby Cron supports five-minute scheduling. Keep scheduling independent of the application so that the external scheduler can be replaced later.

Make the scheduler interval configurable.

Suggested initial interval: five minutes.

Important: the scheduler can be delayed or fail. The system must not assume that a scheduled invocation always happens exactly on time.

### Idempotency

A scheduler may call the endpoint more than once.

The same candle must never generate duplicate signals.

Use database uniqueness constraints and idempotent processing.

A duplicate request must return a safe response without sending another notification.

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
│   ├── strategy/
│   ├── notifications/
│   ├── settings/
│   └── ui/
│
├── lib/
│   ├── mongodb/
│   │   ├── connection.js
│   │   └── models/
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
├── services/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│
├── tests/
│   ├── indicators/
│   ├── strategy/
│   ├── market/
│   └── api/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── STRATEGY.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── .gitignore
├── vercel.json
├── package.json
├── jsconfig.json
└── README.md

You may modify this structure when necessary, but keep clear separation between frontend, API handlers, market services, indicator calculations, and strategy logic.

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

### 2. Zerodha Kite Connect Integration (Production)
When the user purchases the official Kite Connect API:
- Switch `MARKET_DATA_PROVIDER=kite` in `.env.local`.
- Uses official Kite Connect API and supported Node.js SDK.
- Documentation: https://kite.trade/docs/connect/v3/
- Fetch current-month NIFTY futures contract dynamically for true institutional volume.
- The candle ingestion pipeline, storage schema, indicator calculation, and strategy engine remain completely provider-agnostic.

The application needs:

- API key.
- API secret.
- Login URL.
- Request token callback.
- Access token creation.
- Session status.
- Instrument master.
- Historical candle data.
- Quote information if needed.

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

## 11. NOTIFICATIONS

Use the Web Push API and a service worker.

Generate VAPID keys.

Keep private VAPID keys on the server.

Implement:

- Subscribe device.
- Store push subscription.
- Unsubscribe device.
- Send BUY notification.
- Send SELL notification.
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

A push failure must not delete or invalidate a saved signal.

The PWA must work when installed on supported mobile devices.

For iOS, explain that push notifications require an eligible iOS version, Home Screen installation, and user permission.

Do not promise that push delivery is instantaneous.

Show the notification permission status in the application.

## 12. DASHBOARD DESIGN

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
8. EMA 9.
9. EMA 20.
10. VWAP.
11. Current directional bias.
12. Five-minute chart.
13. Recent signal history.

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

## 13. APPLICATION PAGES

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

### Strategy

Display strategy conditions.

Allow enabling and disabling the strategy.

Allow configuration of supported parameters.

Do not allow arbitrary code execution through strategy settings.

### Notifications

Show device subscriptions and notification preferences.

### Settings

Include:

- Zerodha connection.
- Market-data status.
- Calculation instrument.
- Notification settings.
- Timezone.
- System status.
- Application information.

## 14. MONGODB DATABASE DESIGN

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
- expiry
- lotSize
- isActive
- updatedAt

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

Do not fetch all candles or signals into memory.

Implement configurable historical candle retention.

Never delete signal history automatically without explicit configuration.

## 15. API ROUTES

Create structured REST API routes.

Suggested endpoints:

### Authentication

POST /api/auth/login

POST /api/auth/logout

GET /api/auth/session

### Kite

GET /api/kite/login

GET /api/kite/callback

GET /api/kite/status

POST /api/kite/disconnect

### Market

GET /api/market/status

GET /api/market/quote

GET /api/market/candles

GET /api/market/instruments

### Indicators

GET /api/indicators/current

GET /api/indicators/history

### Signals

GET /api/signals

GET /api/signals/latest

GET /api/signals/[id]

### Strategies

GET /api/strategies

POST /api/strategies

PATCH /api/strategies/[id]

POST /api/strategies/[id]/toggle

### Notifications

POST /api/notifications/subscribe

POST /api/notifications/unsubscribe

GET /api/notifications/status

GET /api/notifications/history

### Scheduled processing

GET /api/cron/process-market

POST /api/cron/process-market

Protect the cron endpoint with a strong CRON_SECRET.

Do not allow public callers to execute market-processing jobs without authentication.

Validate all request parameters using Zod.

Return consistent JSON response structures.

Use proper HTTP status codes.

Never return raw exception details or secrets to the frontend.

## 16. SECURITY RULES

Security is mandatory.

1. Never expose KITE_API_SECRET.
2. Never expose KITE_API_KEY unnecessarily.
3. Never expose Kite access tokens to frontend code.
4. Never expose MongoDB connection strings.
5. Never expose VAPID private keys.
6. Never expose CRON_SECRET.
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
20. Keep all order-placement functionality out of the application.

## 17. ENVIRONMENT VARIABLES

Create a documented .env.example.

Expected variables:

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

Do not put private values in NEXT_PUBLIC variables.

Do not invent credentials.

When a real credential is needed, explain where the user obtains it and ask the user to configure it securely.

Do not print credentials in terminal logs or generated documentation.

## 18. ERROR HANDLING AND SYSTEM RELIABILITY

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
- Market holiday.
- Market closed.
- Stale market data.

Every failure should be logged safely.

A failed market-data request must not create a signal.

A failed indicator calculation must not create a signal.

A failed notification must not erase a signal.

Never display stale data as live data.

## 19. TESTING REQUIREMENTS

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

Create known numerical test fixtures.

Do not rely exclusively on mocked tests.

Test database indexes and duplicate prevention against a test database.

Do not claim a feature is complete until its relevant tests pass.

## 20. TRADING SAFETY AND BACKTESTING

This is an alerting tool, not a guaranteed profitable strategy.

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

Do not automatically translate a NIFTY directional signal into an option strike or execute an options order.

The user makes all trading decisions manually.

## 21. PWA REQUIREMENTS

Implement:

- manifest.json.
- Service worker.
- Application icons.
- Installable PWA.
- Responsive mobile layout.
- Web Push subscription.
- Notification click handling.
- Offline fallback page.

Do not cache private API responses or sensitive user information in the service worker.

Do not display outdated market information as current while offline.

Show an offline indicator.

## 22. CODING STANDARDS

Use JavaScript strict mode.

Write clean, modular JavaScript.

Use reusable components.

Use meaningful variable and function names.

Separate UI, database access, market logic, indicators, strategy, and notifications.

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

## 23. USER INTERFACE DESIGN RULES

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

- BUY: green.
- SELL: red.
- Neutral: grey.
- Market status: contextual.
- Warning/stale data: amber.

Avoid excessive animations.

Avoid decorative elements that interfere with market information.

Do not use fake prices or fake signals.

## 24. DOCUMENTATION

Maintain these documents:

README.md

Explain setup, installation, development, and deployment.

docs/ARCHITECTURE.md

Explain system architecture and data flow.

docs/DATABASE.md

Explain MongoDB collections and indexes.

docs/API.md

Document API endpoints and request/response examples.

docs/STRATEGY.md

Document exact BUY and SELL conditions.

docs/DEPLOYMENT.md

Explain Vercel and MongoDB deployment.

Update documentation whenever implementation changes.

## 25. DEVELOPMENT MILESTONES

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

### MILESTONE 6: PWA AND NOTIFICATIONS

Tasks:

- Implement manifest.
- Implement service worker.
- Implement installation support.
- Implement VAPID.
- Implement subscription storage.
- Implement push delivery.
- Implement notification history.
- Test mobile installation and permissions.

Deliverable:

An installable PWA that can receive alerts when backgrounded, subject to platform support and delivery delays.

### MILESTONE 7: SCHEDULER AND RECOVERY

Tasks:

- Implement protected market-processing endpoint.
- Implement idempotent execution.
- Implement completed-candle processing.
- Implement historical recovery.
- Implement stale-data detection.
- Implement market-calendar checks.
- Document external scheduler configuration.
- Test repeated and delayed invocations.

Deliverable:

A scheduled market-processing system that works without a persistent backend process.

### MILESTONE 8: CHARTS AND FINAL DASHBOARD

Tasks:

- Implement candlestick chart.
- Add VWAP.
- Add EMA 9 and EMA 20.
- Add signal markers.
- Add latest signal card.
- Add signal history.
- Add market health indicators.
- Add responsive mobile refinements.

Deliverable:

A complete trading alert dashboard.

### MILESTONE 9: TESTING AND DEPLOYMENT

Tasks:

- Run all unit tests.
- Run integration tests.
- Check security.
- Check build.
- Check Vercel deployment.
- Configure production environment variables.
- Configure MongoDB network access.
- Configure external scheduler.
- Configure notification permissions.
- Test actual market-data processing.
- Document known limitations.

Deliverable:

A deployed and verified application.

## 26. HOW YOU MUST WORK AS AN ANTIGRAVITY AGENT

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
14. Do not use placeholder implementations for critical market-data or strategy logic.
15. If a third-party API requires credentials, clearly explain the setup.
16. If documentation is uncertain, check official documentation rather than guessing.
17. Do not invent API endpoints, request formats, or response fields.
18. Do not silently change strategy conditions.
19. Do not silently change the calculation instrument.
20. Do not introduce automated order execution.
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

Do not implement all nine milestones in a single response.

## 27. FINAL NON-NEGOTIABLE RULES

- One repository only.
- Next.js frontend and backend only.
- MongoDB Atlas database.
- Vercel-compatible architecture.
- No Express server.
- No persistent Socket.IO server.
- No permanent Kite WebSocket listener.
- Five-minute candle analysis.
- VWAP + EMA 9 + EMA 20.
- BUY and SELL alerts only.
- Web Push notifications.
- Single-user private application.
- Dark trading dashboard.
- No automated order execution.
- No invented market data.
- No duplicate signals.
- No signals from incomplete or stale candles.
- No secrets in frontend code.
- No untested critical logic.

The objective is a reliable, understandable, maintainable NIFTY 50 alert application, not merely a visually attractive dashboard.

Start with MILESTONE 1 only.