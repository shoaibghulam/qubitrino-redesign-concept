/* Tiny DOM helpers — every node is built with createElement, never innerHTML. */

/** el("p", { class: "x" }, "text", child) — null/undefined/false attributes and children are skipped */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    node.setAttribute(key, value === true ? "" : String(value));
  });
  children.flat().forEach((child) => {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  });
  return node;
}

export const NBSP = " ";

/** Loss share as "97 %" with a non-breaking space; "—" when there is nothing to divide. */
export function formatShare(share) {
  return share === null ? "—" : `${share}${NBSP}%`;
}

/** Set text on an element by id; silently skipping would hide a broken template, so fail loudly. */
export function setText(id, text) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`landing: missing #${id}`);
  node.textContent = text;
  return node;
}

export function byId(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`landing: missing #${id}`);
  return node;
}

export function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const daysWord = (n) => `${n} ${plural(n, "день", "дня", "дней")}`;
export const tradesWord = (n) => `${n} ${plural(n, "сделка", "сделки", "сделок")}`;

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Bar height on a square-root scale: one 43-trade day must not flatten normal days into slivers. */
export function barHeight(trades, maxTrades, maxPx, minPx) {
  return Math.max(minPx, Math.round(Math.sqrt(trades / maxTrades) * maxPx));
}
