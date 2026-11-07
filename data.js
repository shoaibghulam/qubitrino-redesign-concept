/*
  Data source: demo-otchet-mt5.html (fictional MT5 report supplied with the test task).
  Daily rows are aggregated from the 138 closing deals; summary figures are copied
  from the report's "Результаты" block. Rules are illustrative — the real ones are
  set by the trader in «Правила».
*/
export const ACCOUNT = Object.freeze({
  name: "Иванов И. И.",
  number: "5000000001",
  broker: "AlfaForexRU-Real",
  period: "24 фев — 30 мар 2026",
  symbol: "GBPUSD · NZDUSD · EURUSD",
});

export const SUMMARY = Object.freeze({
  netProfit: -48854.86,
  grossProfit: 38208.25,
  grossLoss: -87063.11,
  profitFactor: 0.44,
  expectancy: -354.02,
  trades: 138,
  winRate: 15.94,
  maxLossStreak: 21,
  maxLossStreakSum: -10792.3,
  avgWin: 1736.74,
  avgLoss: -750.54,
  longs: Object.freeze({ count: 98, winRate: 12.24 }),
  shorts: Object.freeze({ count: 40, winRate: 25.0 }),
});

export const RULES = Object.freeze([
  Object.freeze({ id: "max-trades", label: "Не больше 10 сделок в день", limit: 10 }),
  Object.freeze({ id: "max-loss", label: "Дневной убыток не больше 2 000 ₽", limit: -2000 }),
]);

// [date ISO, P&L ₽, trades, winning trades]
const RAW_DAYS = [
  ["2026-02-24", -89, 4, 1],
  ["2026-02-25", -102, 3, 0],
  ["2026-02-26", -508, 7, 0],
  ["2026-02-27", 2062, 5, 3],
  ["2026-03-02", -24594, 43, 4],
  ["2026-03-11", -1073, 2, 0],
  ["2026-03-12", 3322, 25, 8],
  ["2026-03-13", -11929, 24, 3],
  ["2026-03-16", -2539, 4, 0],
  ["2026-03-17", -11654, 12, 2],
  ["2026-03-26", -280, 1, 0],
  ["2026-03-27", -524, 5, 1],
  ["2026-03-30", -785, 3, 0],
];

function brokenRules(pnl, trades) {
  const broken = [];
  if (trades > RULES[0].limit) broken.push(RULES[0].id);
  if (pnl < RULES[1].limit) broken.push(RULES[1].id);
  return broken;
}

export const DAYS = Object.freeze(
  RAW_DAYS.map(([date, pnl, trades, wins]) =>
    Object.freeze({ date, pnl, trades, wins, broken: brokenRules(pnl, trades) })
  )
);

export function disciplineSplit(days) {
  const kept = days.filter((d) => d.broken.length === 0);
  const broken = days.filter((d) => d.broken.length > 0);
  const sum = (list) => list.reduce((acc, d) => acc + d.pnl, 0);
  return { kept, broken, keptPnl: sum(kept), brokenPnl: sum(broken) };
}

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return { day: d.getDate(), month: MONTHS[d.getMonth()], weekday: WEEKDAYS[d.getDay()] };
}

const NBSP = " ";
export function formatMoney(value, { sign = true, decimals = 0 } = {}) {
  const abs = Math.abs(value).toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const prefix = value < 0 ? "−" : sign && value > 0 ? "+" : "";
  return `${prefix}${abs}${NBSP}₽`;
}

/* ---------- Added for the multi-section cabinet (existing exports above are unchanged) ---------- */

// The concept treats the last trading day of the report as «сегодня».
export const TODAY = "2026-03-30";

/** ISO-8601 week number and the Monday that starts it, for an ISO date string */
export function isoWeek(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d.getTime() - weekday * 86400000);
  const thursday = new Date(monday.getTime() + 3 * 86400000);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = 1 + Math.floor((thursday - yearStart) / (7 * 86400000));
  return { week, monday: monday.toISOString().slice(0, 10) };
}
