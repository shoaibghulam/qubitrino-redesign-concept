/* Guarded aggregates: every share and average goes through here, so an empty group or a
   meaningless ratio becomes null (shown as «—») instead of NaN or a negative percent. */
import { formatMoney } from "../data.js";

export const DASH = "—";
export const NBSP = " ";

export const sumPnl = (days) => days.reduce((s, d) => s + d.pnl, 0);

/** Average P&L per day, or null for an empty group */
export const avgPnl = (days) => (days.length ? sumPnl(days) / days.length : null);

/**
 * Share (0–100, rounded) of a loss that falls on `part`. Null unless both are losses and
 * the part is not bigger than the whole — a «share of loss» means nothing otherwise.
 */
export function lossShare(part, whole) {
  if (!(whole < 0) || !(part < 0) || part < whole) return null;
  return Math.round((part / whole) * 100);
}

export const percentText = (value) => (value === null ? DASH : `${value}${NBSP}%`);
export const moneyOrDash = (value, options) => (value === null ? DASH : formatMoney(value, options));
