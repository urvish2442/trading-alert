/**
 * P&L & Charges Calculation Engine for Options Paper Trading
 * Conforms to GEMINI.md Section 11.8
 */

/**
 * Calculates total quantity based on lot size and number of lots
 * @param {number} lotSize - Standard lot size from exchange master (e.g. 75, 50, 25)
 * @param {number} numberOfLots - Number of lots traded (default: 1)
 * @returns {number}
 */
export function calculateTotalQuantity(lotSize = 75, numberOfLots = 1) {
  const lots = Math.max(1, Math.floor(Number(numberOfLots) || 1));
  const size = Math.max(1, Math.floor(Number(lotSize) || 75));
  return lots * size;
}

/**
 * Calculates gross P&L, net P&L, and percentage return for an option trade
 *
 * @param {object} params
 * @param {number} params.entryPremium - Entry execution price per unit
 * @param {number} params.currentOrExitPremium - Current market premium or exit price
 * @param {number} params.totalQuantity - Total number of units
 * @param {number} [params.estimatedCharges=0] - Estimated transaction charges in rupees
 * @returns {{ grossPnl: number, estimatedCharges: number, netPnl: number, returnPercentage: number }}
 */
export function calculateTradePnl({
  entryPremium,
  currentOrExitPremium,
  totalQuantity,
  estimatedCharges = 0,
}) {
  const entry = Number(entryPremium);
  const exit = Number(currentOrExitPremium);
  const qty = Number(totalQuantity);
  const charges = Math.max(0, Number(estimatedCharges) || 0);

  if (isNaN(entry) || entry <= 0) {
    throw new Error(`Invalid entry premium: ${entryPremium}`);
  }
  if (isNaN(exit) || exit < 0) {
    throw new Error(`Invalid exit/current premium: ${currentOrExitPremium}`);
  }
  if (isNaN(qty) || qty <= 0) {
    throw new Error(`Invalid total quantity: ${totalQuantity}`);
  }

  const pointDiff = exit - entry;
  const grossPnl = Number((pointDiff * qty).toFixed(2));
  const netPnl = Number((grossPnl - charges).toFixed(2));
  const returnPercentage = Number(((pointDiff / entry) * 100).toFixed(2));

  return {
    grossPnl,
    estimatedCharges: Number(charges.toFixed(2)),
    netPnl,
    returnPercentage,
  };
}

