# NIFTY Options Paper Trading Engine Documentation

## 1. Overview & Architectural Isolation

The NIFTY Options Paper Trading module automatically simulates NIFTY 50 options buying whenever the Pine Script v6 (VWAP + EMA 9) strategy generates confirmed signals.

### Absolute Safety Guarantees (GEMINI.md Section 11.1)
- **ZERO LIVE BROKER ORDERS:** The module is strictly isolated from live broker trading and has zero access to order-placement, order-modification, or live trading endpoints.
- **Option Buying Only:** The engine strictly buys options (Long CE on bullish signals, Long PE on bearish signals). Option writing, naked shorting, or multi-leg option strategies are strictly prohibited.
- **Single-Position Constraint:** The engine enforces a maximum of **ONE active open paper position** at any time.

---

## 2. Trading Signals & Directional Mapping

Strategy signals from the Pine Script v6 reversal engine map directly to options contracts:

| Strategy Signal | Directional Interpretation | Simulated Action | Target Contract |
| :--- | :--- | :--- | :--- |
| `BUY CALL` | Bullish Breakout / Crossover | Buy Call Option | NIFTY 100-pt ITM CE (Current Week Expiry) |
| `BUY PUT` | Bearish Breakdown / Crossunder | Buy Put Option | NIFTY 100-pt ITM PE (Current Week Expiry) |
| `EXIT CALL` | Bullish Trend Neutralized | Close Active CE Position | Flat (No trade) |
| `EXIT PUT` | Bearish Trend Neutralized | Close Active PE Position | Flat (No trade) |

> **CRITICAL RULE:** A `SELL` signal represents a bearish event and is simulated as **BUY PE** (long put option), **never** short selling.

---

## 3. Dynamic ITM Strike Selection

Strikes are selected mathematically using the live NIFTY 50 spot price at the moment of candle close:

1. **ATM Strike Calculation:**
   $$\text{ATM Strike} = \text{round}\left(\frac{\text{Spot Price}}{\text{Strike Interval}}\right) \times \text{Strike Interval}$$
   *(Default NIFTY strike interval = 50 points)*

2. **In-The-Money (ITM) Offset (Default: 100 points):**
   - **Call Option (CE):** Strike is **below ATM** (lower strike = ITM):
     $$\text{Selected CE Strike} = \text{ATM Strike} - 100$$
   - **Put Option (PE):** Strike is **above ATM** (higher strike = ITM):
     $$\text{Selected PE Strike} = \text{ATM Strike} + 100$$

*Example:*
- Spot: `26,240` &rarr; ATM = `26,250`
- `BUY CALL` &rarr; Buy `26,150 CE`
- `BUY PUT` &rarr; Buy `26,350 PE`

---

## 4. Current-Week Expiry Selection & Safety Cutoff

- Expiries are resolved dynamically from active contracts in the Kite Connect instrument master.
- Expiries in the past are rejected. The nearest active expiry (chronologically ascending) &ge; today in `Asia/Kolkata` is selected.
- **Expiry Safety Rule:** At 15:15 IST on expiry day, any open position is automatically closed before exchange close to prevent expired/delisted positions remaining open indefinitely.

---

## 5. P&L Accounting Engine

### Gross Profit & Loss
- For an `OPEN` position (Unrealized Gross P&L):
  $$\text{Unrealized P\&L} = (\text{Current Premium} - \text{Entry Premium}) \times \text{Total Quantity}$$
- For a `CLOSED` position (Realized Gross P&L):
  $$\text{Realized Gross P\&L} = (\text{Exit Premium} - \text{Entry Premium}) \times \text{Total Quantity}$$

### Net P&L & Charges
$$\text{Net Realized P\&L} = \text{Gross P\&L} - \text{Estimated Charges}$$
$$\text{Return (\%)} = \left(\frac{\text{Exit Premium} - \text{Entry Premium}}{\text{Entry Premium}}\right) \times 100$$

### Quantity Calculations
$$\text{Total Quantity} = \text{Lot Size} \times \text{Number of Lots}$$
*(Lot size is fetched dynamically from the exchange master, typically 75 for NIFTY).*

---

## 6. Position Reversal Lifecycle

When an opposite signal is received (e.g. `BUY PUT` while a `CE` position is active):
1. **Step 1:** The existing `CE` position is closed at current market Bid/LTP price, realized P&L is calculated, and the record is saved as `CLOSED`.
2. **Step 2:** The new `100-pt ITM PE` contract is resolved and opened at current Ask/LTP price.
3. **Decoupled Failure Safety:** If Step 1 succeeds but Step 2 fails (e.g. quote timeout), the closed exit is preserved cleanly and the error is logged to `SystemLog`. The application never rolls back a legitimate exit.

---

## 7. REST API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/paper-trading/summary` | `GET` | Returns summary cards (Total trades, win rate, realized/unrealized P&L, active position). |
| `/api/paper-trading/trades` | `GET` | Paginated and filtered trade history (filters: `optionType`, `status`, `outcome`, dates). |
| `/api/paper-trading/trades/[id]` | `GET` | Returns individual paper trade detail by `tradeId`. |
| `/api/paper-trading/open-position` | `GET` | Returns active open position with live mark-to-market. |
| `/api/paper-trading/daily-pnl` | `GET` | Returns daily P&L series for charts. |
| `/api/paper-trading/monthly-pnl` | `GET` | Returns monthly performance analytics and date-wise breakdown grouped in `Asia/Kolkata`. |
| `/api/paper-trading/settings` | `GET` / `PATCH` | Manages paper trading settings (lots, ITM distance, fill method, charges). |
| `/api/paper-trading/exit` | `POST` | Triggers simulated manual paper exit for active open position. |
| `/api/paper-trading/process` | `POST` | Triggers manual valuation update and expiry safety check. |
