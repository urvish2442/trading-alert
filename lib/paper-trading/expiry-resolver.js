/**
 * Dynamic Expiry Date Resolver & Expiry Safety Cutoff
 * Conforms to GEMINI.md Section 11.4
 */

/**
 * Returns date formatted as YYYY-MM-DD in Asia/Kolkata timezone
 * @param {Date | string | number} date
 * @returns {string}
 */
export function getIstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/**
 * Parses time in Asia/Kolkata for a given Date
 * @param {Date | string | number} date
 * @returns {{ hours: number, minutes: number, timeString: string }}
 */
export function getIstTime(date = new Date()) {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);

  const hours = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minutes = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const timeString = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  return { hours, minutes, timeString };
}

/**
 * Resolves the nearest active weekly expiry from a list of available option expiry dates
 * @param {Array<Date | string>} availableExpiries - Available expiries from instrument master
 * @param {Date} [referenceDate=new Date()] - Reference current date
 * @returns {Date | null} - Nearest active weekly expiry Date object
 */
export function resolveCurrentWeeklyExpiry(availableExpiries, referenceDate = new Date()) {
  if (!Array.isArray(availableExpiries) || availableExpiries.length === 0) {
    return null;
  }

  const todayIstStr = getIstDateString(referenceDate);

  // Filter out any expiries in the past (before today in IST)
  const validExpiries = availableExpiries
    .map((exp) => new Date(exp))
    .filter((d) => !isNaN(d.getTime()))
    .filter((d) => {
      const expIstStr = getIstDateString(d);
      return expIstStr >= todayIstStr;
    });

  if (validExpiries.length === 0) {
    return null;
  }

  // Sort ascending chronologically to pick the nearest (current week) expiry
  validExpiries.sort((a, b) => a.getTime() - b.getTime());

  return validExpiries[0];
}

/**
 * Determines whether an open position has reached the expiry-day safety cutoff
 * Default: 15:15 IST on expiry date (15 mins before market close at 15:30 IST)
 *
 * @param {Date | string} expiryDate - Expiry date of the option
 * @param {Date} [currentDate=new Date()] - Current evaluation timestamp
 * @param {string} [cutoffTime="15:15"] - HH:MM cutoff in IST
 * @returns {boolean}
 */
export function isExpirySafetyCutoffReached(
  expiryDate,
  currentDate = new Date(),
  cutoffTime = "15:15"
) {
  if (!expiryDate) return false;

  const expIstStr = getIstDateString(expiryDate);
  const curIstStr = getIstDateString(currentDate);

  // If expiry is already in the past, cutoff is definitely reached
  if (curIstStr > expIstStr) {
    return true;
  }

  // If today is the expiry day, check whether current IST time >= cutoffTime
  if (curIstStr === expIstStr) {
    const { timeString } = getIstTime(currentDate);
    return timeString >= cutoffTime;
  }

  return false;
}
