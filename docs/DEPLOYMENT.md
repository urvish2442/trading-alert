# Production Deployment Guide: NIFTY 50 Intraday Alert PWA

This document provides complete, step-by-step instructions for deploying the **NIFTY 50 VWAP + EMA Intraday Alert PWA** to production on **Vercel** with **MongoDB Atlas**, **Web Push (VAPID)**, and an **External 5-Minute Serverless Scheduler**.

---

## 1. System Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          External Scheduler            │
                      │  (cron-job.org / GitHub Actions)       │
                      │  Calls /api/cron/process-market q5m    │
                      └──────────────────┬─────────────────────┘
                                         │ Bearer CRON_SECRET
                                         ▼
┌──────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
│  End User Mobile PWA │ ◄─── │     Vercel Serverless   │ ────►│    MongoDB Atlas     │
│  (iOS 16.4+ / Android│ Push │     Next.js App Router  │ MDB  │  - 11 Collections    │
│   Web Push Alerts)   │      │  (Node.js 20+ Runtime)  │      │  - Compound Indexes  │
└──────────────────────┘      └────────────┬────────────┘      └──────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │        Market Data Provider         │
                        │  - Yahoo Finance (Demo / Free)      │
                        │  - Zerodha Kite Connect (Production)│
                        └─────────────────────────────────────┘
```

> [!IMPORTANT]
> **Safety Guard**: The application is strictly an **alerting and decision-support system**. It contains **zero automated order placement or execution code**. All trades must be reviewed and placed manually by the user on their broker terminal.

---

## 2. Prerequisites

1. **MongoDB Atlas Account**: Free Tier (M0) or dedicated cluster ([mongodb.com](https://www.mongodb.com/cloud/atlas)).
2. **Vercel Account**: Hobby or Pro plan ([vercel.com](https://vercel.com)).
3. **GitHub Repository**: Pushed source code with `.env.local` omitted.
4. **Node.js 18+ or 20+** locally for administrator setup scripts.
5. *(Optional for Production)* **Zerodha Kite Connect App**: Registered at [kite.trade](https://kite.trade/) when upgrading from Yahoo demo mode to live Kite data.

---

## 3. MongoDB Atlas Configuration

1. **Create Cluster**:
   - Create a free M0 cluster in the **ap-south-1 (Mumbai)** region for lowest latency to Indian market systems.
2. **Database Access**:
   - Create a database user with `readWrite` permissions on database `trading_alert`.
3. **Network Access (IP Whitelist)**:
   - In **Network Access &rarr; IP Access List**, add `0.0.0.0/0` (Allow Access from Anywhere).
   - *Reason*: Vercel serverless execution environments use dynamic egress IPs across the cloud region.
4. **Connection String**:
   - Copy your SRV string: `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`.

---

## 4. Environment Variables Checklist

Add these in **Vercel Dashboard &rarr; Project Settings &rarr; Environment Variables**:

| Variable | Description | Example / Generation Command |
| :--- | :--- | :--- |
| `MONGODB_URI` | Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `MONGODB_DB_NAME` | Database name | `trading_alert` |
| `MARKET_DATA_PROVIDER` | Active provider | `yahoo` (demo) or `kite` (Zerodha) |
| `CRON_SECRET` | Scheduler authentication secret | `openssl rand -hex 32` |
| `APP_ENCRYPTION_KEY` | AES-256-GCM symmetric key (32 bytes) | `openssl rand -hex 32` |
| `AUTH_SECRET` | HMAC-SHA256 session secret | `openssl rand -base64 32` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Web Push VAPID key | `npx web-push generate-vapid-keys` |
| `VAPID_PUBLIC_KEY` | Public Web Push VAPID key (server) | Same as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| `VAPID_PRIVATE_KEY` | Private Web Push VAPID key | Generated from `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | Contact mailto for push services | `mailto:admin@yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | Production application URL | `https://your-domain.vercel.app` |
| `KITE_API_KEY` | *(Optional for Kite)* API key | From `kite.trade` developer console |
| `KITE_API_SECRET` | *(Optional for Kite)* API secret | From `kite.trade` developer console |
| `KITE_REDIRECT_URL` | *(Optional for Kite)* Redirect URL | `https://your-domain.vercel.app/api/kite/callback` |

---

## 5. Vercel Deployment Steps

1. **Connect GitHub**:
   - Go to [Vercel](https://vercel.com), click **Add New &rarr; Project**, and import your repository.
2. **Framework Preset**:
   - Select **Next.js**. Root Directory: `./`.
3. **Configure Environment Variables**:
   - Paste all variables from the checklist above.
4. **Deploy**:
   - Click **Deploy**. Vercel will run `npm run build` and publish your project.
5. **Verify Health Endpoint**:
   - Visit `https://your-domain.vercel.app/api/health`.
   - Confirm response: `{"status":"healthy","database":"connected","version":"1.0.0"}`.

---

## 6. First-Time Administrator Account Setup

The application enforces single-user security. To create the admin account:

### Method A: Local Seed Script
Run locally with your production `MONGODB_URI`:
```bash
MONGODB_URI="<your-atlas-uri>" node scripts/seed-admin.js "admin@trading.local" "YourSecurePassword#2026"
```

### Method B: One-Time Setup API
1. Send a POST request to your deployed setup endpoint:
```bash
curl -X POST https://your-domain.vercel.app/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trading.local","password":"YourSecurePassword#2026"}'
```
2. Once the first administrator is created, this endpoint automatically locks and rejects subsequent creation requests.
3. Log in at `https://your-domain.vercel.app/login`.

---

## 7. External 5-Minute Scheduler Setup

Since Vercel Hobby does not allow sub-daily cron schedules and serverless functions terminate after execution, an external HTTP cron caller triggers the processing pipeline every 5 minutes during Indian market hours.

### Target Endpoint
- **URL**: `https://your-domain.vercel.app/api/cron/process-market`
- **Method**: `GET`
- **Header**: `Authorization: Bearer <CRON_SECRET>`
- **Schedule**: Every 5 minutes from **09:15 to 15:30 IST** (03:45 to 10:00 UTC), **Monday through Friday**.

### Option A: cron-job.org (Free & Recommended)
1. Register at [cron-job.org](https://cron-job.org).
2. Click **Create Cronjob**:
   - **Title**: `NIFTY 50 5m Market Processing`
   - **URL**: `https://your-domain.vercel.app/api/cron/process-market`
   - **Execution Schedule**: User-defined / Every 5 minutes.
   - **Days**: Monday to Friday.
   - **Timeframe**: 09:15 to 15:30 Asia/Kolkata.
   - **HTTP Headers**:
     - Key: `Authorization`
     - Value: `Bearer <YOUR_CRON_SECRET>`
3. Save and enable the job.

### Option B: GitHub Actions Workflow
In `.github/workflows/market-cron.yml`:
```yaml
name: Market Processing Cron
on:
  schedule:
    - cron: '*/5 3-10 * * 1-5' # Every 5 min from 03:00 to 10:00 UTC Mon-Fri
  workflow_dispatch:

jobs:
  ping-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Process Market Endpoint
        run: |
          curl -s -X GET "https://your-domain.vercel.app/api/cron/process-market" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## 8. Mobile PWA Installation & Push Alert Activation

### iOS 16.4+ (iPhone / iPad)
1. Open Safari and navigate to `https://your-domain.vercel.app`.
2. Log in with your admin credentials.
3. Tap the **Share** button (box with upward arrow) at the bottom.
4. Tap **Add to Home Screen**, name it `NIFTY Alert`, and tap **Add**.
5. **Open the app from the Home Screen** (not Safari).
6. Navigate to **Notifications** tab in the bottom bar.
7. Tap **Enable Push Notifications** &rarr; Tap **Allow** when prompted by iOS.
8. Tap **Send Test Notification** to verify audible chime and vibration.

### Android (Chrome / Brave / Edge)
1. Open Chrome and visit `https://your-domain.vercel.app`.
2. Tap the **Install App** button on the dashboard banner or top navbar (or Chrome menu &rarr; **Add to Home screen**).
3. Open the installed application.
4. Navigate to **Notifications** &rarr; Tap **Enable Push Notifications**.
5. Confirm prompt.

---

## 9. Switching to Zerodha Kite Connect in Production

When ready to switch from Yahoo Finance demo mode to live Zerodha Kite Connect:

1. In your Zerodha Developer Console:
   - Set **Redirect URL** to: `https://your-domain.vercel.app/api/kite/callback`
2. In Vercel Project Settings &rarr; Environment Variables:
   - Change `MARKET_DATA_PROVIDER` to `kite`.
   - Add `KITE_API_KEY`, `KITE_API_SECRET`, and `KITE_REDIRECT_URL`.
   - Redeploy or trigger a build.
3. Log in to the application and go to **Settings &rarr; Zerodha Connection**.
4. Click **Connect Zerodha**, log in with your Kite credentials, and authenticate.
5. The system will store your encrypted access token and begin calculating indicators and signals from the current-month NIFTY futures contract.

---

## 10. Operational Monitoring & Recovery

- **Health Check**: `GET /api/health` reports uptime, version, and MongoDB connection pool state.
- **System Audit Logs**: Stored in the `systemlogs` collection and visible on the Settings page.
- **Stale Data Protection**: If the scheduler is interrupted, the Next.js cron engine automatically audits the gap upon resumption, fetches missed 5-minute candles chronologically, advances the strategy state machine, and suppresses stale alerts to avoid alerting fatigue.
- **Idempotency Guarantee**: Compound unique database indexes on `[strategyId, instrumentToken, candleTimestamp, signalType]` guarantee that duplicate scheduler triggers will **never** create duplicate signals or duplicate push notifications.
