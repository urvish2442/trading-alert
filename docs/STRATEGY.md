# Strategy Specification: NIFTY Option Buyer - VWAP EMA9 Both Trends

Based on Pine Script v6 indicator ("NIFTY Option Buyer - VWAP EMA9 Both Trends"):

```pinescript
//@version=6
indicator("NIFTY Option Buyer - VWAP EMA9 Both Trends", overlay=true, max_labels_count=200)

emaLength = input.int(9, "EMA Length")
ema9 = ta.ema(close, emaLength)
vwapValue = ta.vwap(hlc3)

// 0 = No active trade, 1 = PUT active, 2 = CALL active
var int state = 0

vwapDown = ta.crossunder(close, vwapValue)
vwapUp = ta.crossover(close, vwapValue)

emaUp = ta.crossover(close, ema9)
emaDown = ta.crossunder(close, ema9)

if barstate.isconfirmed
    if state == 0
        if vwapDown
            buyPut := true
            state := 1
        else if vwapUp
            buyCall := true
            state := 2
    else if state == 1
        if vwapUp and not emaUp
            buyCall := true
            state := 2
        else if emaUp
            exitPut := true
            state := 0
    else if state == 2
        if vwapDown and not emaDown
            buyPut := true
            state := 1
        else if emaDown
            exitCall := true
            state := 0
```

## Strategy Logic & Crossover Definitions

1. **`vwapUp`**: `prevClose <= prevVWAP && currentClose > currentVWAP`
2. **`vwapDown`**: `prevClose >= prevVWAP && currentClose < currentVWAP`
3. **`emaUp`**: `prevClose <= prevEMA9 && currentClose > currentEMA9`
4. **`emaDown`**: `prevClose >= prevEMA9 && currentClose < currentEMA9`

## State Machine & Signals

| Current State | Condition | Signal Generated | New State |
| :--- | :--- | :--- | :--- |
| **0 (FLAT)** | `vwapDown` | **BUY PUT** (Red) | **1 (PUT Active)** |
| **0 (FLAT)** | `vwapUp` | **BUY CALL** (Green) | **2 (CALL Active)** |
| **1 (PUT Active)** | `vwapUp and not emaUp` | **BUY CALL** (Green Reversal) | **2 (CALL Active)** |
| **1 (PUT Active)** | `emaUp` | **EXIT PUT** (Orange Exit) | **0 (FLAT)** |
| **2 (CALL Active)** | `vwapDown and not emaDown` | **BUY PUT** (Red Reversal) | **1 (PUT Active)** |
| **2 (CALL Active)** | `emaDown` | **EXIT CALL** (Orange Exit) | **0 (FLAT)** |
