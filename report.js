import { DAYS, SUMMARY, RULES, disciplineSplit, formatDate, formatMoney } from "./data.js";

const STRIP_MAX_MM = 20;
const STRIP_MIN_MM = 2.5;

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

function renderHeader() {
  const { kept, broken, keptPnl, brokenPnl } = disciplineSplit(DAYS);
  const days = (n) => `${n} ${plural(n, "день", "дня", "дней")}`;
  document.getElementById("generated").textContent = new Date().toLocaleDateString("ru-RU");
  document.getElementById("kept-n").textContent = days(kept.length);
  document.getElementById("broken-n").textContent = days(broken.length);
  document.getElementById("kept-pnl").textContent = formatMoney(keptPnl);
  document.getElementById("broken-pnl").textContent = formatMoney(brokenPnl);
}

function renderStrip() {
  const strip = document.getElementById("strip");
  const maxTrades = Math.max(...DAYS.map((d) => d.trades));
  DAYS.forEach((day) => {
    const h = Math.max(STRIP_MIN_MM, Math.sqrt(day.trades / maxTrades) * STRIP_MAX_MM);
    const bar = el("span", { class: day.broken.length ? "hatch" : "kept", style: `height:${h.toFixed(1)}mm` });
    strip.append(el("div", {}, bar, String(formatDate(day.date).day)));
  });
}

function renderKpis() {
  const items = [
    ["Итог периода", formatMoney(SUMMARY.netProfit, { decimals: 2 }), "loss"],
    ["Сделок / прибыльных", `${SUMMARY.trades} / ${SUMMARY.winRate.toLocaleString("ru-RU")} %`],
    ["Профит-фактор", SUMMARY.profitFactor.toLocaleString("ru-RU")],
    ["Убытков подряд, макс.", String(SUMMARY.maxLossStreak)],
  ];
  const list = document.getElementById("kpis");
  items.forEach(([label, value, tone = ""]) => {
    list.append(el("div", {}, el("dt", {}, label), el("dd", { class: `num ${tone}` }, value)));
  });
}

function renderRows() {
  const body = document.getElementById("rows");
  DAYS.forEach((day) => {
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

renderHeader();
renderStrip();
renderKpis();
renderRows();
renderNote();
document.getElementById("print").addEventListener("click", () => window.print());
