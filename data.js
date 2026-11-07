/*
  Data source: demo-otchet-mt5.html (fictional MT5 report supplied with the test task).
  Daily rows are grouped from the 138 positions in trades.js by close date; summary figures
  are copied from the report's "Результаты" block. Rules are illustrative — the real ones are
  set by the trader in «Правила».
*/
import { TRADES } from "./trades.js";

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
  Object.freeze({ id: "max-loss", label: "Дневной убыток не больше 2 000 ₽", limit: -2000 }),
]);

const round2 = (v) => Math.round(v * 100) / 100;

/** Trading days grouped from TRADES by close date: { date, pnl, trades, wins } in date order */
function groupTrades(trades) {
  const byDate = new Map();
  trades.forEach((t) => {
    const date = t.close.slice(0, 10);
    const prev = byDate.get(date) ?? { date, pnl: 0, trades: 0, wins: 0 };
    byDate.set(date, { date, pnl: prev.pnl + t.profit, trades: prev.trades + 1, wins: prev.wins + (t.profit > 0 ? 1 : 0) });
  });
  return [...byDate.values()]
    .sort((x, y) => (x.date < y.date ? -1 : 1))
    .map((d) => Object.freeze({ ...d, pnl: round2(d.pnl) }));
}

export const RAW_DAYS = Object.freeze(groupTrades(TRADES));

function brokenRules(pnl, trades) {
  const broken = [];
  if (trades > RULES[0].limit) broken.push(RULES[0].id);
  if (pnl < RULES[1].limit) broken.push(RULES[1].id);
  return broken;
}

/** Days checked against the default RULES (used by the print report) */
export const DAYS = Object.freeze(
  RAW_DAYS.map((day) => Object.freeze({ ...day, broken: brokenRules(day.pnl, day.trades) }))
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
