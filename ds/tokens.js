/*
  Reads colour tokens straight from tokens.css (the single source of truth) and
  measures WCAG 2.x contrast. Nothing here hardcodes a colour value.
*/

const LIGHT_BLOCK = /:root\s*\{/;
const DARK_BLOCK = /:root\[data-theme="dark"\]\s*\{/;
const VAR_LINE = /--c-([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g;

function blockBody(css, pattern) {
  const match = pattern.exec(css);
  if (!match) throw new Error(`в tokens.css нет блока ${pattern.source}`);
  const start = match.index + match[0].length;
  const end = css.indexOf("}", start);
  return css.slice(start, end);
}

function readVars(body) {
  const out = {};
  for (const m of body.matchAll(VAR_LINE)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

export function parseTokens(css) {
  const light = readVars(blockBody(css, LIGHT_BLOCK));
  const dark = { ...light, ...readVars(blockBody(css, DARK_BLOCK)) };
  if (Object.keys(light).length === 0) throw new Error("в tokens.css не найдено ни одного --c-* токена");
  return { light, dark };
}

export async function loadTokens(url = "tokens.css") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`tokens.css ответил ${response.status}`);
  return parseTokens(await response.text());
}

/* ---------- WCAG 2.x relative luminance and contrast ---------- */

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Composite a translucent foreground over an opaque background */
export function blend(fg, bg, alpha) {
  return fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)));
}

export const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
export const toCss = (rgb) => `rgb(${rgb.join(" ")})`;

export const formatRatio = (r) => `${(Math.floor(r * 100) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} : 1`;

/**
 * Grade a ratio for its use. Text: AA 4.5, AA-large 3. Non-text UI/graphics: 3 (1.4.11).
 * Decorative hairlines are reported but carry no requirement.
 */
export function grade(ratio, kind) {
  if (kind === "decor") return { label: "декор", pass: null };
  if (kind === "nontext") return ratio >= 3 ? { label: "3:1 графика", pass: true } : { label: "ниже 3:1", pass: false };
  if (ratio >= 4.5) return { label: "AA", pass: true };
  if (ratio >= 3) return { label: "AA крупный", pass: "large" };
  return { label: "не проходит", pass: false };
}
