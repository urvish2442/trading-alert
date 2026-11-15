# External Scheduler & Market Processing Configuration (Milestone 7)

## 1. Overview
The market processing system runs entirely on **stateless, serverless architecture** in compliance with GEMINI.md Section 4.
It does **NOT** rely on:
* An always-running background Node daemon
* `setInterval` or `setTimeout`
* Persistent WebSocket connections

Instead, an external scheduler invokes the protected endpoint `/api/cron/process-market` **every 5 minutes** during Indian market hours.

---

## 2. Protected Endpoint Specification

* **Endpoint**: `POST /api/cron/process-market` (also supports `GET`)
* **Schedule Interval**: Every 5 minutes (`*/5 9-15 * * 1-5` IST)
* **Authentication**: Requires high-entropy `CRON_SECRET`

### Authentication Methods
1. **Header (Recommended)**:
   ```http
   Authorization: Bearer <CRON_SECRET>
   ```
2. **Custom Header**:
   ```http
   x-cron-secret: <CRON_SECRET>
   ```
3. **URL Query Parameter**:
   ```http
   POST /api/cron/process-market?secret=<CRON_SECRET>
   ```

---

## 3. Execution Pipeline on Each Invocation

When triggered, `/api/cron/process-market` executes 12 deterministic steps:
1. **Verifies Authentication**: Returns `401 Unauthorized` if `CRON_SECRET` is missing or invalid.
2. **Market Calendar Check**: Validates whether the current IST time is a trading day (Monday–Friday) and between **09:15 and 15:30 IST**. Automatically skips execution on weekends and exchange holidays.
   *(Pass `?force=true` to test execution outside market hours).*
3. **Provider Validation**: Checks that the active provider (`yahoo` or `kite`) is operational.
4. **Candle Ingestion**: Synchronizes completed 5-minute candles into MongoDB Atlas with idempotent upserting.
5. **Freshness Audit**: Detects if market data is stale (> 15 minutes old).
6. **Idempotency Guard**: Checks whether the latest completed candle was already processed. If already processed, safely returns `{ status: "idempotent" }` without re-evaluating or sending duplicate alerts.
7. **Historical Recovery**: If the scheduler missed runs (due to network delay or outage), identifies all missed candles and processes them in strict chronological order.
8. **Technical Indicators**: Calculates EMA 9 and Session VWAP (HLC3).
9. **Strategy State Machine**: Evaluates Pine Script v6 Option Buyer logic (`FLAT`, `PUT ACTIVE`, `CALL ACTIVE`).
10. **Signal Generation**: Idempotently creates signals in MongoDB Atlas.
11. **Web Push Dispatch**: Dispatches native notifications only for newly transitioned live signals (suppresses duplicate or historical recovered alerts).
12. **Audit Logging**: Persists execution metrics into `systemLogs`.

---

## 4. Setting Up Free External Schedulers

### Option A: Cron-job.org (Free & Recommended)
1. Sign up for free at [cron-job.org](https://cron-job.org).
2. Click **Create Cronjob**:
   * **Title**: `NIFTY 50 Market Alert Cron`
   * **URL**: `https://your-app.vercel.app/api/cron/process-market`
   * **Schedule**: Every 5 minutes (User-defined or cron expression `*/5 9-15 * * 1-5`)
   * **Timezone**: `Asia/Kolkata (IST)`
   * **Request Method**: `POST`
   * **Headers**:
     * Key: `Authorization`
     * Value: `Bearer <YOUR_CRON_SECRET>`
3. Save job. It will trigger automatically during trading sessions.

---

### Option B: GitHub Actions Scheduled Workflow
You can run a free GitHub Action cron by committing `.github/workflows/market-cron.yml`:

```yaml
name: Market Processing Cron

on:
  schedule:
    # Runs every 5 minutes Mon-Fri (UTC time: 03:45 to 10:00 UTC = 09:15 to 15:30 IST)
    - cron: '*/5 3-10 * * 1-5'
  workflow_dispatch:

jobs:
  trigger-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Process Market API
        run: |
          curl -s -X POST "${{ secrets.APP_URL }}/api/cron/process-market" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

---

## 5. Local Testing & Verification

Run curl in your terminal:

```bash
# Test with Authorization Header and Force Mode:
curl -X POST "http://localhost:3000/api/cron/process-market?force=true" \
  -H "Authorization: Bearer cron_scheduler_secret_key_minimum_32_characters_12345"
```

