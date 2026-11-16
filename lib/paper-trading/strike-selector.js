/**
 * Dynamic In-The-Money (ITM) Strike Selector for NIFTY Options
 * Conforms to GEMINI.md Section 11.3
 */

/**
 * Calculates nearest At-The-Money (ATM) strike price based on reference spot price
 * @param {number} spotPrice - Reference index spot price (e.g., 26240)
 * @param {number} strikeInterval - Dynamic strike interval (default: 50 for NIFTY)
 * @returns {number} - ATM strike price (e.g., 26250)
 */
export function calculateAtmStrike(spotPrice, strikeInterval = 50) {
  if (typeof spotPrice !== "number" || isNaN(spotPrice) || spotPrice <= 0) {
    throw new Error(`Invalid spot price for ATM calculation: ${spotPrice}`);
  }
  if (typeof strikeInterval !== "number" || isNaN(strikeInterval) || strikeInterval <= 0) {
    throw new Error(`Invalid strike interval: ${strikeInterval}`);
  }

  return Math.round(spotPrice / strikeInterval) * strikeInterval;
}

/**
 * Selects In-The-Money (ITM) strike for CE or PE
 * - For CE (Call Option): Lower strike = ITM -> ATM - itmDistance
 * - For PE (Put Option): Higher strike = ITM -> ATM + itmDistance
 *
 * @param {object} params
 * @param {number} params.spotPrice - Reference spot price
 * @param {string} params.optionType - "CE" or "PE"
 * @param {number} [params.itmDistance=100] - Distance in points (default: 100)
 * @param {number} [params.strikeInterval=50] - Strike interval in points (default: 50)
 * @returns {{ atmStrike: number, selectedStrike: number, optionType: string, itmDistance: number }}
 */
export function selectItmStrike({
  spotPrice,
  optionType,
  itmDistance = 100,
  strikeInterval = 50,
}) {
  const normType = String(optionType || "").toUpperCase();
  if (normType !== "CE" && normType !== "PE") {
    throw new Error(`Invalid option type "${optionType}". Must be "CE" or "PE".`);
  }

  const atmStrike = calculateAtmStrike(spotPrice, strikeInterval);
  const distance = Math.max(0, Number(itmDistance) || 0);

  let selectedStrike;
  if (normType === "CE") {
    // For Call options: Strike below ATM is ITM
    selectedStrike = atmStrike - distance;
  } else {
    // For Put options: Strike above ATM is ITM
    selectedStrike = atmStrike + distance;
  }

  return {
    atmStrike,
    selectedStrike,
    optionType: normType,
    itmDistance: distance,
    strikeInterval,
  };
}
