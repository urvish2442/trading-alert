# MongoDB Atlas Database Architecture: NIFTY 50 Intraday Alert

The database layer utilizes **MongoDB Atlas Free Tier (M0)** with Mongoose models, optimized for serverless connection pooling and compound unique indexing.

---

## 1. Mongoose Models & Collections

| Collection | Model File | Purpose | Key Indexes |
| :--- | :--- | :--- | :--- |
| `users` | `lib/mongodb/models/User.js` | Single admin authentication | `{ email: 1 }` (unique) |
| `brokersessions` | `lib/mongodb/models/BrokerSession.js` | Kite Connect session tokens | `{ provider: 1 }` (unique) |
| `instruments` | `lib/mongodb/models/Instrument.js` | NIFTY spot & futures master | `{ instrumentToken: 1 }` (unique) |
| `candles` | `lib/mongodb/models/Candle.js` | 5-minute completed OHLCV | `{ instrumentToken: 1, timeframe: 1, candleTimestamp: 1 }` (unique) |
| `indicators` | `lib/mongodb/models/Indicator.js` | Computed VWAP, EMA 9, EMA 20 | `{ instrumentToken: 1, timeframe: 1, candleTimestamp: 1 }` (unique) |
| `strategies` | `lib/mongodb/models/Strategy.js` | Strategy configuration | `{ name: 1 }` (unique) |
| `strategystates` | `lib/mongodb/models/StrategyState.js` | Active state (`0:FLAT, 1:PUT, 2:CALL`) | `{ strategyId: 1, instrumentToken: 1 }` (unique) |
| `signals` | `lib/mongodb/models/Signal.js` | Generated BUY/SELL alerts | `{ strategyId: 1, instrumentToken: 1, candleTimestamp: 1, signalType: 1 }` (unique) |
| `pushsubscriptions` | `lib/mongodb/models/PushSubscription.js`| Browser push endpoints & keys | `{ endpoint: 1 }` (unique) |
| `notificationlogs` | `lib/mongodb/models/NotificationLog.js` | Web Push delivery audit log | `{ createdAt: -1 }` |
| `systemlogs` | `lib/mongodb/models/SystemLog.js` | System errors & scheduler logs | `{ createdAt: -1 }` |

---

## 2. Serverless Connection Management (`lib/mongodb/connection.js`)

To prevent connection spikes and exhaustion during Vercel serverless function invocations:
- Uses a cached global promise (`global.mongooseConn`).
- Configures `bufferCommands: false` to fail fast if connection drops.
- Maintains a pool size of 10 connections per serverless container.

---

## 3. Idempotency & Data Invariants

- **Candle Deduplication**: A 5-minute candle timestamp is unique per instrument. Upserts use `updateOne({ instrumentToken, timeframe, candleTimestamp }, { $set: ... }, { upsert: true })`.
- **Signal Idempotency**: A signal cannot be created twice for the same strategy, instrument, candle timestamp, and signal type. MongoDB unique constraint guarantees zero duplicate alerts.
- **Auto Expiration**: Notification logs and system logs can use TTL indexes to maintain storage within free cluster quotas.
