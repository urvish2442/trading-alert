# Web Push Notifications & PWA Architecture (Milestone 6)

## 1. Overview
The NIFTY 50 Intraday Alert system uses the **Web Push API**, cryptographically signed **VAPID keys**, and a client-side **Service Worker** (`/sw.js`) to deliver instantaneous background alerts to user devices without requiring the app or browser to remain actively open.

## 2. VAPID Configuration
Voluntary Application Server Identification (VAPID) authenticates our Next.js backend with push services (Google FCM, Apple Push Notification service, Mozilla autopush).

* `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Used client-side to subscribe the device via `pushManager.subscribe()`.
* `VAPID_PUBLIC_KEY`: Server-side public key.
* `VAPID_PRIVATE_KEY`: Server-side private key (never exposed to browser or client).
* `VAPID_SUBJECT`: Contact URI (`mailto:admin@trading.local`).

## 3. Database Collections (MongoDB Atlas)

### `pushSubscriptions`
Stores device push endpoints and client public keys.
* `endpoint`: Full push service endpoint URL (unique compound index).
* `subscription`: Standard Web Push subscription object containing `keys.p256dh` and `keys.auth`.
* `deviceName`: User-friendly client label (e.g., "Apple iOS Device", "Android Device", "Mac Desktop").
* `enabled`: Boolean active status.

### `notificationLogs`
Audit trail of every push dispatch attempt.
* `signalId`: Reference to triggering `Signal` document.
* `subscriptionId`: Reference to target `PushSubscription`.
* `status`: `"sent"` or `"failed"`.
* `errorMessage`: HTTP status code and error details if delivery failed.
* `sentAt`: Timestamp of delivery.

## 4. Automatic Expired Subscription Cleanup
Per Section 11 specifications, when a push service returns HTTP `410 Gone` or `404 Not Found` (indicating the user cleared browser data or uninstalled the PWA), the backend automatically deletes the dead subscription record from MongoDB Atlas.

## 5. Mobile & Platform Installation

### Apple iOS (iPhone & iPad)
1. Supported on **iOS 16.4+**.
2. Open Safari and navigate to your application URL.
3. Tap Safari's **Share** button $\rightarrow$ scroll down and select **"Add to Home Screen"**.
4. Launch the application from your iPhone's Home Screen (in standalone mode).
5. Navigate to **Notifications** $\rightarrow$ tap **"Enable Push Notifications"** $\rightarrow$ tap **"Allow"** when iOS prompts.

### Android & Desktop Chrome / Edge
* Push notifications work directly in standard browser tabs or installed PWA mode.
* The application surfaces an **"Install App"** button in the header when eligible.

