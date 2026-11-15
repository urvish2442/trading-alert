# REST API Reference: NIFTY 50 Intraday Alert System

All API endpoints are implemented as Next.js App Router route handlers running on the Node.js runtime.

---

## 1. System Health

### `GET /api/health`
- **Access**: Public
- **Description**: Returns deployment health, server uptime, version, and MongoDB connection status.
- **Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-11-15T13:00:00.000Z",
  "uptime": 124.5
}
```

---

## 2. Authentication

### `POST /api/auth/setup`
- **Access**: One-time initial setup (locks after first user is created)
- **Body**: `{ "email": "admin@example.com", "password": "StrongPassword" }`
- **Response**: `201 Created` with user details.

### `POST /api/auth/login`
- **Access**: Public (Rate limited)
- **Body**: `{ "email": "admin@example.com", "password": "StrongPassword" }`
- **Response**: Sets `trading_alert_session` HTTP-only signed cookie.

### `POST /api/auth/logout`
- **Access**: Protected
- **Response**: Clears `trading_alert_session` cookie.

### `GET /api/auth/session`
- **Access**: Protected
- **Response**: `{ "authenticated": true, "user": { "id": "...", "email": "...", "role": "admin" } }`

---

## 3. Zerodha Kite Connect

### `GET /api/kite/login`
- **Access**: Protected
- **Description**: Generates Zerodha OAuth login URL.

### `GET /api/kite/callback`
- **Access**: Public (OAuth callback)
- **Query**: `?request_token=...&action=request_token&status=success`
- **Description**: Exchanges `request_token` for encrypted access token and redirects to `/settings`.

### `GET /api/kite/status`
- **Access**: Protected
- **Description**: Returns Zerodha session state, token expiry, and connected status.

---

## 4. Market Data

### `GET /api/market/status`
- **Access**: Protected
- **Description**: Returns Indian exchange calendar status (OPEN, CLOSED, HOLIDAY, SPECIAL_SESSION) and time to next open/close.

### `GET /api/market/quote`
- **Access**: Protected
- **Description**: Returns current spot price for `NIFTY 50` and futures quote.

### `GET /api/market/candles`
- **Access**: Protected
- **Query**: `?symbol=NIFTY 50&timeframe=5minute&limit=100`
- **Description**: Returns completed 5-minute historical candles from MongoDB Atlas.

### `POST /api/market/sync`
- **Access**: Protected
- **Description**: Manually triggers candle synchronization with the active market data provider.

---

## 5. Technical Indicators

### `GET /api/indicators/current`
- **Access**: Protected
- **Description**: Returns latest computed Session VWAP (HLC3), EMA 9, EMA 20, and directional bias.

### `GET /api/indicators/history`
- **Access**: Protected
- **Query**: `?symbol=NIFTY 50&limit=100`
- **Description**: Returns historical indicator series alongside candle timestamps for charting.

---

## 6. Strategy & Signal Engine

### `GET /api/signals`
- **Access**: Protected
- **Query**: `?page=1&limit=20&signalType=BUY CALL&fromDate=...&toDate=...`
- **Description**: Returns paginated historical signals with filter support.

### `GET /api/signals/latest`
- **Access**: Protected
- **Description**: Returns most recent signal and current strategy state (`0: FLAT`, `1: PUT`, `2: CALL`).

### `GET /api/signals/[id]`
- **Access**: Protected
- **Description**: Returns detailed signal metadata by ObjectId.

### `GET /api/strategies`
- **Access**: Protected
- **Description**: Returns active strategy details ("NIFTY Option Buyer - VWAP EMA9 Both Trends", v2.0.0).

### `POST /api/strategies/evaluate`
- **Access**: Protected
- **Description**: Evaluates strategy rules against latest candles and updates state.

---

## 7. Web Push Notifications

### `GET /api/notifications/vapid-key`
- **Access**: Public
- **Description**: Returns the public VAPID key for browser service worker subscription.

### `POST /api/notifications/subscribe`
- **Access**: Protected
- **Body**: `{ "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }, "deviceName": "iPhone 15" }`
- **Description**: Upserts push subscription in MongoDB Atlas.

### `POST /api/notifications/unsubscribe`
- **Access**: Protected
- **Body**: `{ "endpoint": "..." }`
- **Description**: Removes device subscription.

### `POST /api/notifications/test`
- **Access**: Protected
- **Description**: Sends immediate test notification to verify delivery, audible sound, and vibration.

### `GET /api/notifications/status`
- **Access**: Protected
- **Description**: Returns active subscriber count and recent notification delivery logs.

---

## 8. Scheduled Market Processing (Cron)

### `GET /api/cron/process-market` / `POST /api/cron/process-market`
- **Access**: Protected via `CRON_SECRET`
- **Headers**: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`
- **Query**: `?secret=<CRON_SECRET>&force=true`
- **Workflow**:
  1. Validates `CRON_SECRET`.
  2. Verifies Indian market is open (or `force=true` for testing).
  3. Audits for missed candles and runs chronological recovery.
  4. Ingests latest completed 5-minute candle.
  5. Computes Session VWAP (HLC3) and EMA 9.
  6. Evaluates "NIFTY Option Buyer - VWAP EMA9 Both Trends" state machine.
  7. Persists new signal idempotently.
  8. Dispatches Web Push alert to all active subscribers.
  9. Logs processing metrics to `systemlogs`.
- **Response**:
```json
{
  "success": true,
  "marketStatus": "OPEN",
  "candlesIngested": 1,
  "signalGenerated": {
    "type": "BUY CALL",
    "candleTimestamp": "2026-11-13T10:00:00.000Z",
    "candleClose": 24150,
    "vwap": 24120.5,
    "ema9": 24115.2,
    "stateTransition": "0 -> 2"
  },
  "notificationsSent": 2,
  "executionDurationMs": 245
}
```
