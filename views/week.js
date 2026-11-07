/* «Неделя» — week-by-week review (ISO weeks): days kept/broken, trades, result, one takeaway. */
import { TODAY, isoWeek, formatDate, formatMoney } from "../data.js";
import { el, pageHead, swatch, tradesWord, daysWord, plural } from "./dom.js";
import { currentDays } from "./rule-kinds.js";

const WEEKDAYS = Object.freeze(["пн", "вт", "ср", "чт", "пт"]);
const DAY_MS = 86400000;

const addDays = (iso, n) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);
const short = (iso) => { const { day, month } = formatDate(iso); return `${day} ${month}`; };
const sumPnl = (days) => days.reduce((s, d) => s + d.pnl, 0);

/** Weeks keyed by their Monday (ISO string — safe across year boundaries), newest first */
function groupWeeks(days) {
  const byMonday = new Map();
  days.forEach((day) => {
    const { week, monday } = isoWeek(day.date);
    const prev = byMonday.get(monday) ?? { week, monday, days: [] };
    byMonday.set(monday, { ...prev, days: [...prev.days, day] });
  });
  return [...byMonday.values()].sort((a, b) => (a.monday < b.monday ? 1 : -1));
}

const brokenNames = (day) => day.brokenRules.map((r) => r.label.toLowerCase()).join("; ");

function singleDayText(day, isCurrent) {
  if (day.broken.length) return `Единственный торговый день — с нарушениями: ${brokenNames(day)}. ${tradesWord(day.trades)}, ${formatMoney(day.pnl)}.`;
  const kept = `${tradesWord(day.trades)}, правила соблюдены`;
  return isCurrent ? `Неделя только началась: ${kept}. Итог — в пятницу.` : `Единственный торговый день: ${kept}, ${formatMoney(day.pnl)}.`;
}

function takeaway(days, isCurrent) {
  if (days.length === 1) return singleDayText(days[0], isCurrent);
  const broken = days.filter((d) => d.broken.length);
  const total = sumPnl(days);
  if (!broken.length) {
    return total > 0
      ? `Все ${daysWord(days.length)} по правилам — и неделя в плюсе.`
      : `Правила соблюдены; убыток ${formatMoney(total)} остался в пределах дневных лимитов.`;
  }
  const worst = broken.reduce((a, b) => (b.pnl < a.pnl ? b : a));
  const lucky = broken.find((d) => d.pnl > 0);
  const base = `${broken.length} из ${days.length} ${plural(days.length, "дня", "дней", "дней")} с нарушениями дали ${formatMoney(sumPnl(broken))}. Худший — ${short(worst.date)}: ${tradesWord(worst.trades)}.`;
  return lucky ? `${base} ${short(lucky.date)} в плюсе, но вне правил — это везение, не система.` : base;
}

/** Mon–Fri slots: a bar for a trading day, an empty outline when there was no trading */
function weekSlots(monday, days) {
  return el("ol", { class: "grid grid-cols-5 gap-1.5", "aria-label": "Дни недели" },
    WEEKDAYS.map((wd, i) => {
      const date = addDays(monday, i);
      const day = days.find((d) => d.date === date);
      const state = !day ? "нет торговли" : day.broken.length ? "есть нарушения" : "по правилам";
      const ring = date === TODAY ? "ring-2 ring-action ring-offset-2 ring-offset-surface" : "";
      const bar = day
        ? el("span", { class: `block h-7 rounded-[4px] ${ring} ${day.broken.length ? "hatch" : "bg-kept"}`, "aria-hidden": "true" })
        : el("span", { class: "block h-7 rounded-[4px] border border-dashed border-line", "aria-hidden": "true" });
      return el("li", {},
        bar,
        el("span", { class: "mt-1 block text-center text-[11px] text-ink-2", "aria-hidden": "true" }, wd),
        el("span", { class: "sr-only" }, `${wd}, ${short(date)}: ${state}`));
    }));
}

function stat(label, value, tone = "") {
  return el("div", {}, el("dt", { class: "text-[12px] text-ink-2" }, label), el("dd", { class: `num mt-0.5 text-[17px] font-medium ${tone}` }, value));
}

function weekRow({ week, monday, days }, isCurrent) {
  const trades = days.reduce((s, d) => s + d.trades, 0);
  const total = sumPnl(days);
  const kept = days.filter((d) => !d.broken.length).length;
  return el("li", {
    "aria-current": isCurrent ? "true" : null,
    class: `grid gap-x-8 gap-y-4 px-4 py-5 sm:px-5 lg:grid-cols-[150px_220px_1fr] ${isCurrent ? "bg-surface shadow-[inset_3px_0_0_rgb(var(--c-action))]" : ""}`,
  },
    el("div", {},
      el("h2", { class: "flex items-center gap-2 text-[15px] font-semibold" }, `Неделя ${week}`,
        isCurrent ? el("span", { class: "rounded-sm bg-action/10 px-1.5 py-0.5 text-[12px] font-medium text-ink" }, "текущая") : null),
      el("p", { class: "num mt-0.5 text-[13px] text-ink-2" }, `${short(monday)} — ${short(addDays(monday, 4))}`)),
    weekSlots(monday, days),
    el("div", { class: "min-w-0" },
      el("dl", { class: "flex flex-wrap gap-x-8 gap-y-2" },
        stat("Сделок", String(trades)),
        stat("Результат", formatMoney(total), total < 0 ? "text-loss" : "text-gain"),
        stat("По правилам", `${kept} из ${days.length}`)),
      el("p", { class: "mt-3 max-w-[70ch] text-[14px] leading-relaxed" }, takeaway(days, isCurrent))));
}

function legendRow() {
  return el("p", { class: "mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-2" },
    el("span", { class: "flex items-center gap-2" }, swatch(false), "по правилам"),
    el("span", { class: "flex items-center gap-2" }, swatch(true), "есть нарушения"),
    el("span", { class: "flex items-center gap-2" }, el("span", { class: "inline-block h-3 w-3 rounded-[3px] border border-dashed border-ink-3", "aria-hidden": "true" }), "нет торговли"),
    el("span", { class: "flex items-center gap-2" }, el("span", { class: "inline-block h-3 w-3 rounded-[3px] ring-2 ring-action", "aria-hidden": "true" }), "сегодня"));
}

function render(root) {
  const weeks = groupWeeks(currentDays());
  const current = isoWeek(TODAY).monday;
  root.append(
    pageHead("Обзор по неделям", "Неделя", `${weeks.length} ${plural(weeks.length, "неделя", "недели", "недель")} с торговлей, новые сверху. Неделя — пн–пт по ISO; выходные в отчёте пустые.`),
    legendRow(),
    el("ol", { class: "mt-4 divide-y divide-line overflow-hidden rounded-md border border-line", "aria-label": "Недели периода" },
      weeks.map((w) => weekRow(w, w.monday === current))));
}

export default Object.freeze({ title: "Неделя", render });
