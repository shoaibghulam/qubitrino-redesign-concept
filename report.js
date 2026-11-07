import { DAYS, RULES, TODAY, formatDate, formatMoney } from "./data.js";
import { TRADES } from "./trades.js";

const STRIP_MAX_MM = 20;
const STRIP_MIN_MM = 2.5;
const NBSP = " ";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

// Same keys as the report builder in the cabinet (views/reports-form.js)
const TYPES = Object.freeze({
  discipline: { title: "Правила и результат", kicker: "отчёт о дисциплине" },
  deals: { title: "Сделки за период", kicker: "отчёт по сделкам" },
  ai: { title: "Сводка с ИИ-анализом", kicker: "сводка с ИИ-анализом" },
});

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  children.flat().forEach((child) => node.append(child));
  return node;
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/**
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD&type=discipline|deals|ai from «Отчёты».
 * Anything invalid falls back to the whole period / discipline report.
 * (?theme is ignored on purpose: the printed page is always light.)
 */
function readParams() {
  const params = new URLSearchParams(location.search);
  const valid = (v) => v && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
  const from = params.get("from");
  const to = params.get("to");
  const range = valid(from) && valid(to) && from <= to ? { from, to } : { from: DAYS[0].date, to: DAYS.at(-1).date };
  const days = DAYS.filter((d) => d.date >= range.from && d.date <= range.to);
  const type = Object.hasOwn(TYPES, params.get("type") ?? "") ? params.get("type") : "discipline";
  return days.length ? { days, type } : { days: DAYS, type };
}

const longDate = (iso) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };

function renderHeader({ days, type }) {
  const first = days[0].date;
  const last = days.at(-1).date;
  const heading = document.getElementById("report-title");
  heading.replaceChildren(TYPES[type].title, el("br"), `${longDate(first)} — ${longDate(last)} ${last.slice(0, 4)}`);
  document.getElementById("report-kind").textContent = TYPES[type].kicker;
  document.title = `${TYPES[type].title}, ${longDate(first)} — ${longDate(last)} — концепт печатной страницы Qubitrino`;
  document.getElementById("generated").textContent = TODAY.split("-").reverse().join(".");
}

function renderSplit(days) {
  const kept = days.filter((d) => d.broken.length === 0);
  const broken = days.filter((d) => d.broken.length > 0);
  const sum = (list) => list.reduce((acc, d) => acc + d.pnl, 0);
  const count = (n) => `${n} ${plural(n, "день", "дня", "дней")}`;
  document.getElementById("kept-n").textContent = count(kept.length);
  document.getElementById("broken-n").textContent = count(broken.length);
  document.getElementById("kept-pnl").textContent = formatMoney(sum(kept));
  document.getElementById("broken-pnl").textContent = formatMoney(sum(broken));
}

function renderStrip(days) {
  const strip = document.getElementById("strip");
  const maxTrades = Math.max(...days.map((d) => d.trades));
  days.forEach((day) => {
    const h = Math.max(STRIP_MIN_MM, Math.sqrt(day.trades / maxTrades) * STRIP_MAX_MM);
    const bar = el("span", { class: day.broken.length ? "hatch" : "kept", style: `height:${h.toFixed(1)}mm` });
    strip.append(el("div", {}, bar, String(formatDate(day.date).day)));
  });
}

/** KPIs recomputed from the trades of the selected days (equal to the MT5 summary for the whole period) */
function kpis(days) {
  const dates = new Set(days.map((d) => d.date));
  const trades = TRADES.filter((t) => dates.has(t.close.slice(0, 10))).sort((a, b) => (a.close < b.close ? -1 : 1));
  const wins = trades.filter((t) => t.profit > 0);
  const gross = (list) => list.reduce((s, t) => s + t.profit, 0);
  const grossLoss = -gross(trades.filter((t) => t.profit < 0));
  const streak = trades.reduce((acc, t) => {
    const run = t.profit < 0 ? acc.run + 1 : 0;
    return { run, max: Math.max(acc.max, run) };
  }, { run: 0, max: 0 }).max;
  const pct = trades.length ? `${((wins.length / trades.length) * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}${NBSP}%` : "—";
  const pf = grossLoss > 0 ? (gross(wins) / grossLoss).toLocaleString("ru-RU", { maximumFractionDigits: 2 }) : "—";
  const net = gross(trades);
  return [
    ["Итог периода", formatMoney(net, { decimals: 2 }), net < 0 ? "loss" : "gain"],
    ["Сделок / прибыльных", `${trades.length} / ${pct}`],
    ["Профит-фактор", pf],
    ["Убытков подряд, макс.", String(streak)],
  ];
}

function renderKpis(days) {
  const list = document.getElementById("kpis");
  kpis(days).forEach(([label, value, tone = ""]) => {
    list.append(el("div", {}, el("dt", {}, label), el("dd", { class: `num ${tone}` }, value)));
  });
}

function renderRows(days) {
  const body = document.getElementById("rows");
  days.forEach((day) => {
    const { day: d, month, weekday } = formatDate(day.date);
    const broken = day.broken.map((id) => RULES.find((r) => r.id === id).label).join("; ");
    const rulesCell = broken
      ? el("span", {}, el("span", { class: "swatch hatch" }), broken)
      : el("span", { class: "muted" }, "—");
    body.append(el("tr", {},
      el("td", {}, `${d} ${month}, ${weekday}`),
      el("td", { class: "num r" }, String(day.trades)),
      el("td", { class: "num r" }, String(day.wins)),
      el("td", { class: `num r ${day.pnl < 0 ? "loss" : "gain"}` }, formatMoney(day.pnl)),
      el("td", {}, rulesCell)));
  });
}

function renderNote() {
  const rules = RULES.map((r) => r.label.toLowerCase()).join("; ");
  document.getElementById("rules-note").textContent =
    `Правила периода: ${rules}. Сплошной столбец — день без нарушений, штриховка — хотя бы одно нарушение. ` +
    "Данные — демонстрационный отчёт MT5.";
}

const report = readParams();
renderHeader(report);
renderSplit(report.days);
renderStrip(report.days);
renderKpis(report.days);
renderRows(report.days);
renderNote();
document.getElementById("print").addEventListener("click", () => window.print());
