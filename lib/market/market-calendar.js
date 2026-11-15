/**
 * NSE Market Calendar & Session Logic
 * Timezone: Asia/Kolkata
 * Normal Session: 09:15 to 15:30 IST
 */

// NSE Official Holidays (YYYY-MM-DD in IST)
const NSE_HOLIDAYS = new Set([
  // 2025 Holidays
  "2025-01-26", // Republic Day
  "2025-02-26", // Maha Shivratri
  "2025-03-14", // Holi
  "2025-03-31", // Id-Ul-Fitr
  "2025-04-10", // Mahavir Jayanti
  "2025-04-14", // Dr. Baba Saheb Ambedkar Jayanti
  "2025-04-18", // Good Friday
  "2025-05-01", // Maharashtra Day
  "2025-06-07", // Bakri Id
  "2025-08-15", // Independence Day
  "2025-08-27", // Ganesh Chaturthi
  "2025-10-02", // Mahatma Gandhi Jayanti / Dussehra
  "2025-10-21", // Diwali Laxmi Pujan
  "2025-10-22", // Diwali Balipratipada
  "2025-11-05", // Guru Nanak Jayanti
  "2025-12-25", // Christmas

  // 2026 Holidays
  "2026-01-26", // Republic Day
  "2026-03-03", // Holi
  "2026-03-20", // Id-Ul-Fitr
  "2026-04-03", // Good Friday
  "2026-04-14", // Ambedkar Jayanti
  "2026-05-01", // Maharashtra Day
  "2026-05-27", // Bakri Id
  "2026-08-15", // Independence Day
  "2026-10-02", // Gandhi Jayanti
  "2026-10-20", // Dussehra
  "2026-11-09", // Diwali Laxmi Pujan
  "2026-11-10", // Diwali Balipratipada
  "2026-11-24", // Guru Nanak Jayanti
  "2026-12-25", // Christmas
]);

/**
 * Converts a Date to an object with IST year, month, date, hours, minutes
 * @param {Date} date
 */
export function getISTTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);
  const weekday = map.weekday;

  const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
    dateString,
  };
}

/**
 * Checks if the given date is a weekday and not an exchange holiday
 * @param {Date} date
 * @returns {boolean}
 */
export function isTradingDay(date = new Date()) {
  const ist = getISTTimeParts(date);

  // Check weekend
  if (ist.weekday === "Sat" || ist.weekday === "Sun") {
    return false;
  }

  // Check holiday
  if (NSE_HOLIDAYS.has(ist.dateString)) {
    return false;
  }

  return true;
}

/**
 * Checks if market is actively open (09:15 to 15:30 IST on a trading day)
 * @param {Date} date
 * @returns {boolean}
 */
export function isMarketHours(date = new Date()) {
  if (!isTradingDay(date)) {
    return false;
  }

  const ist = getISTTimeParts(date);
  const totalMinutes = ist.hour * 60 + ist.minute;

  const openMinutes = 9 * 60 + 15;  // 09:15 IST
  const closeMinutes = 15 * 60 + 30; // 15:30 IST

  return totalMinutes >= openMinutes && totalMinutes < closeMinutes;
}

/**
 * Returns detailed market state description
 * @param {Date} date
 * @returns {{ state: string, isOpen: boolean, isTradingDay: boolean, istTime: string, reason: string }}
 */
export function getMarketSessionStatus(date = new Date()) {
  const ist = getISTTimeParts(date);
  const istTime = `${String(ist.hour).padStart(2, "0")}:${String(ist.minute).padStart(2, "0")}:${String(ist.second).padStart(2, "0")}`;

  if (ist.weekday === "Sat" || ist.weekday === "Sun") {
    return {
      state: "MARKET CLOSED",
      isOpen: false,
      isTradingDay: false,
      istTime,
      reason: `Weekend (${ist.weekday})`,
    };
  }

  if (NSE_HOLIDAYS.has(ist.dateString)) {
    return {
      state: "MARKET CLOSED",
      isOpen: false,
      isTradingDay: false,
      istTime,
      reason: "Exchange Holiday",
    };
  }

  const totalMinutes = ist.hour * 60 + ist.minute;
  const openMinutes = 9 * 60 + 15;
  const closeMinutes = 15 * 60 + 30;

  if (totalMinutes < openMinutes) {
    return {
      state: "PRE-MARKET",
      isOpen: false,
      isTradingDay: true,
      istTime,
      reason: "Market opens at 09:15 IST",
    };
  }

  if (totalMinutes >= closeMinutes) {
    return {
      state: "MARKET CLOSED",
      isOpen: false,
      isTradingDay: true,
      istTime,
      reason: "Market closed at 15:30 IST",
    };
  }

  return {
    state: "MARKET OPEN",
    isOpen: true,
    isTradingDay: true,
    istTime,
    reason: "Normal trading session (09:15 - 15:30 IST)",
  };
}

