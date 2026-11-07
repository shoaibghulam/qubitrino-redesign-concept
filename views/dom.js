/* Shared DOM helpers. Everything is built with createElement — never innerHTML. */

const SVG_NS = "http://www.w3.org/2000/svg";

/** el("p", { class: "x" }, "text", child) — attributes with null/false are skipped */
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

export function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

export const ICONS = Object.freeze({
  home: "M4 11l8-7 8 7v9H4z",
  deals: "M4 6h16M4 12h16M4 18h10",
  numbers: "M5 20V10M12 20V4M19 20v-7",
  rules: "M6 4h12v16H6zM9 9h6M9 13h6",
  mark: "M5 12l4 4 10-10",
  week: "M4 6h16v14H4zM4 10h16M9 4v4M15 4v4",
  reports: "M7 3h7l4 4v14H7zM14 3v4h4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  close: "M6 6l12 12M18 6L6 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M7.5 7.5l2 2M14.5 14.5l2 2M16.5 7.5l-2 2M9.5 14.5l-2 2",
  alert: "M12 8v5M12 16.5v.01M10.3 4.3L2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z",
  sort: "M8 9l4-4 4 4M8 15l4 4 4-4",
});

export function icon(name, size = 20) {
  const root = svg("svg", {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    "stroke-width": 1.7, "aria-hidden": "true", class: "shrink-0",
  });
  root.append(svg("path", { d: ICONS[name], "stroke-linecap": "round", "stroke-linejoin": "round" }));
  return root;
}

export function plural(n, one, few, many) {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const daysWord = (n) => `${n} ${plural(n, "день", "дня", "дней")}`;
export const tradesWord = (n) => `${n} ${plural(n, "сделка", "сделки", "сделок")}`;

/** Page heading block: micro-label + h1 (focus target on route change) + optional lead */
export function pageHead(kicker, title, lead) {
  return el("header", { class: "max-w-[64ch]" },
    el("p", { class: "text-[12px] font-medium uppercase tracking-[0.08em] text-ink-2" }, kicker),
    el("h1", { tabindex: "-1", class: "mt-1 text-[26px] sm:text-[30px] font-semibold tracking-tight leading-tight focus:outline-none focus-visible:outline-none" }, title),
    lead ? el("p", { class: "mt-2 text-[14px] leading-relaxed text-ink-2" }, lead) : null);
}

export const microLabel = (text, id) =>
  el("h2", { id, class: "text-[12px] font-medium uppercase tracking-[0.08em] text-ink-2" }, text);

export const sectionTitle = (text, id) => el("h2", { id, class: "text-[17px] font-semibold" }, text);

/** Hatched / solid swatch for kept vs broken */
export const swatch = (broken, size = "h-3 w-3") =>
  el("span", { class: `inline-block ${size} shrink-0 rounded-[3px] ${broken ? "hatch" : "bg-kept"}`, "aria-hidden": "true" });

export const BTN_PRIMARY = "inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-action px-4 text-[14px] font-medium text-on-action hover:opacity-90 active:translate-y-px transition disabled:opacity-50";
export const BTN_QUIET = "inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-line bg-surface px-4 text-[14px] hover:border-ink-3 transition-colors";
export const CHIP = "inline-flex h-10 items-center rounded-sm border border-line px-3 text-[13px] text-ink-2 hover:border-ink-3 transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper";
