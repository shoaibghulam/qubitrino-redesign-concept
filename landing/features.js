/* Feature bento: small, real fragments built from data.js. */
import { DAYS, RULES, SUMMARY, formatDate, formatMoney } from "../data.js";
import { el, byId, setText, daysWord, tradesWord, barHeight, NBSP } from "./dom.js";

// Profitable-but-broken (12 мар) next to a clean profit and the worst day — the product's point in 3 rows.
const DIARY_DATES = ["2026-02-27", "2026-03-02", "2026-03-12"];
const WEEK_DATES = ["2026-03-11", "2026-03-12", "2026-03-13"];
const RULE_SHORT = Object.freeze({ "max-trades": `>${NBSP}10 сделок`, "max-loss": `убыток >${NBSP}2${NBSP}000${NBSP}₽` });
const pickDays = (dates) => DAYS.filter((d) => dates.includes(d.date));
const moneyClass = (v) => (v < 0 ? "text-loss" : "text-gain");

function ruleCell(day) {
  if (!day.broken.length) {
    return el("span", { class: "inline-flex items-center gap-1.5 text-ink-2" },
      el("span", { class: "inline-block h-2.5 w-2.5 rounded-[2px] bg-kept", "aria-hidden": "true" }), "соблюдены");
  }
  return el("span", { class: "inline-flex items-center gap-1.5 text-ink" },
    el("span", { class: "hatch inline-block h-2.5 w-2.5 rounded-[2px]", "aria-hidden": "true" }),
    day.broken.map((id) => RULE_SHORT[id]).join(", "));
}

function renderDiary() {
  const body = byId("diary-rows");
  pickDays(DIARY_DATES).forEach((day) => {
    const { day: d, month, weekday } = formatDate(day.date);
    body.append(el("tr", { class: "border-b border-line last:border-0" },
      el("td", { class: "num whitespace-nowrap py-3 pr-3" }, `${d} ${month} `, el("span", { class: "text-ink-3" }, weekday)),
      el("td", { class: "num py-3 pl-3 text-right" }, String(day.trades)),
      el("td", { class: `num whitespace-nowrap py-3 pl-3 text-right font-medium ${moneyClass(day.pnl)}` }, formatMoney(day.pnl)),
      el("td", { class: "whitespace-nowrap py-3 pl-4 text-[13px]" }, ruleCell(day))));
  });
}

function renderRuleStats() {
  const list = byId("rule-stats");
  RULES.forEach((rule) => {
    const brokenDays = DAYS.filter((d) => d.broken.includes(rule.id)).length;
    const share = Math.round((brokenDays / DAYS.length) * 100);
    const meter = el("span", { class: "mt-2 flex h-1.5 overflow-hidden rounded-full bg-sunken", "aria-hidden": "true" },
      el("span", { class: "hatch block h-full", style: `width:${share}%` }));
    list.append(el("li", { class: "py-4" },
      el("p", { class: "flex items-baseline justify-between gap-4 text-[14px]" },
        el("span", { class: "font-medium" }, keepUnitTogether(rule.label)),
        el("span", { class: "num shrink-0 text-ink-2" }, `${brokenDays} из ${DAYS.length}`)),
      meter,
      el("p", { class: "mt-1.5 text-[12px] text-ink-3" }, `нарушено в ${daysWord(brokenDays)}`)));
  });
}

function weekBar(day, maxTrades) {
  const { day: d, weekday } = formatDate(day.date);
  const height = barHeight(day.trades, maxTrades, 56, 8);
  return el("li", { class: "flex flex-1 flex-col items-center justify-end" },
    el("span", { class: `block w-full max-w-[44px] rounded-[3px] ${day.broken.length ? "hatch" : "bg-kept"}`, style: `height:${height}px`, "aria-hidden": "true" }),
    el("span", { class: "num mt-1.5 text-[11px] text-ink-3" }, `${weekday} ${d}`),
    el("span", { class: `num text-[12px] font-medium ${moneyClass(day.pnl)}` }, formatMoney(day.pnl)));
}

function renderWeek() {
  const days = pickDays(WEEK_DATES);
  const maxTrades = Math.max(...DAYS.map((d) => d.trades));
  const total = days.reduce((acc, d) => acc + d.pnl, 0);
  const broken = days.filter((d) => d.broken.length).length;
  const bars = el("ol", { class: "flex h-[104px] items-end gap-3", "aria-label": "Неделя 9–13 марта" },
    days.map((day) => weekBar(day, maxTrades)));
  const greenBroken = days.find((d) => d.pnl > 0 && d.broken.length);
  const note = el("p", { class: "mt-4 border-t border-line pt-3 text-[13px] leading-snug text-ink-2" },
    `9–13 мар: ${formatMoney(total)}, нарушения в ${broken} из ${days.length} дней. `,
    greenBroken ? `Плюсовой четверг — тоже нарушение: ${tradesWord(greenBroken.trades)} при лимите ${RULES[0].limit}.` : null);
  byId("week-sample").append(bars, note);
}

function a4Line(width, extra = "") {
  return el("span", { class: `block h-[3px] rounded-full bg-line ${extra}`, style: `width:${width}%` });
}

function renderA4() {
  const thumb = byId("a4-thumb");
  const maxTrades = Math.max(...DAYS.map((d) => d.trades));
  const strip = el("span", { class: "mt-2 flex h-[30px] items-end gap-[2px]" },
    DAYS.map((day) => el("span", {
      class: `block flex-1 rounded-[1px] ${day.broken.length ? "hatch" : "bg-kept"}`,
      style: `height:${barHeight(day.trades, maxTrades, 30, 3)}px`,
    })));
  thumb.append(
    el("span", { class: "block text-[7px] font-semibold leading-none" }, "Отчёт за период"),
    el("span", { class: "num mt-1 block text-[5.5px] leading-none text-ink-3" }, "24.02 — 30.03.2026"),
    el("span", { class: "num mt-2 block text-[9px] font-semibold leading-none text-loss" }, formatMoney(SUMMARY.netProfit)),
    strip,
    el("span", { class: "mt-2.5 block space-y-[4px]" }, a4Line(100), a4Line(86), a4Line(92), a4Line(64), a4Line(78), a4Line(55)));
}

function renderInsight() {
  const { shorts, longs } = SUMMARY;
  const shortShare = Math.round((shorts.count / SUMMARY.trades) * 100);
  const avg = (list) => list.reduce((acc, d) => acc + d.trades, 0) / list.length;
  const brokenAvg = avg(DAYS.filter((d) => d.broken.length));
  const keptAvg = avg(DAYS.filter((d) => !d.broken.length));
  setText("ai-insight",
    `В дни с нарушениями вы открывали в среднем ${formatNum(brokenAvg)} сделки, в дни по правилам — ${formatNum(keptAvg)}. ` +
    `Шорты закрывались в плюс вдвое чаще лонгов (${formatPct(shorts.winRate)} против ${formatPct(longs.winRate)}), но это лишь ${shortShare}${NBSP}% сделок.`);
  setText("ai-basis", `Основано на ${SUMMARY.trades} сделках периода · иллюстрация, не торговая рекомендация`);
}

const formatNum = (v) => v.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
const formatPct = (v) => `${formatNum(v)} %`;
/** "2 000 ₽" must not break before the currency sign. */
const keepUnitTogether = (text) => text.replace(/ (\d{3}) ₽/g, " $1 ₽");

export function renderFeatures() {
  renderDiary();
  renderRuleStats();
  renderWeek();
  renderA4();
  renderInsight();
}
