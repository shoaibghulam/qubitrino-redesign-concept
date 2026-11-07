/* «Мои цифры» — behaviour vs result for the period (the original single screen). */
import { DAYS, SUMMARY, disciplineSplit, formatDate, formatMoney } from "../data.js";
import { el, pageHead, daysWord, swatch, BTN_PRIMARY } from "./dom.js";
import { dayStrip, describeDay } from "./strip.js";
import { mountCurve } from "./curve.js";

const RULE_SHORT = Object.freeze({ "max-trades": "> 10 сделок", "max-loss": "убыток > 2 000 ₽" });

function bigFigure(label, broken, value, note) {
  return el("div", { class: broken ? "sm:pl-8" : "sm:pr-8" },
    el("p", { class: "flex items-center gap-2 text-[14px] text-ink-2" }, swatch(broken), label),
    el("p", { class: `num mt-2 text-[34px] sm:text-[44px] font-medium leading-none tracking-tight ${broken ? "text-loss" : ""}` }, value),
    el("p", { class: "mt-2 text-[14px] text-ink-2" }, note));
}

function splitSection() {
  const { kept, broken, keptPnl, brokenPnl } = disciplineSplit(DAYS);
  const share = Math.round((brokenPnl / (keptPnl + brokenPnl)) * 100);
  return el("section", { "aria-labelledby": "split-h", class: "mt-8 border-y border-line py-7" },
    el("h2", { id: "split-h", class: "text-[12px] font-medium uppercase tracking-[0.08em] text-ink-2" }, "Правила и результат"),
    el("p", { class: "mt-2 max-w-[30ch] text-[22px] sm:text-[28px] leading-[1.2] font-semibold tracking-tight" },
      `${share}% убытка за период пришлись на ${daysWord(broken.length)}, когда правила были нарушены.`),
    el("div", { class: "mt-6 grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-line" },
      bigFigure("Дни по правилам", false, formatMoney(keptPnl), `${daysWord(kept.length)} · в среднем ${formatMoney(keptPnl / kept.length)} в день`),
      bigFigure("Дни с нарушениями", true, formatMoney(brokenPnl), `${daysWord(broken.length)} · в среднем ${formatMoney(brokenPnl / broken.length)} в день`)));
}

function stripSection(onSelect) {
  const detail = el("p", { class: "mt-3 min-h-[48px] rounded-sm bg-sunken px-4 py-3 text-[14px]", "aria-live": "polite" });
  const strip = dayStrip(DAYS, { label: "Торговые дни периода", onSelect });
  const section = el("section", { "aria-labelledby": "strip-h", class: "mt-8" },
    el("div", { class: "flex items-baseline justify-between gap-4" },
      el("h2", { id: "strip-h", class: "text-[17px] font-semibold" }, "Отметки дней"),
      el("p", { class: "text-[13px] text-ink-2" }, "Высота — число сделок")),
    strip.node, detail);
  return { section, strip, detail };
}

function kpiList() {
  const rows = [
    ["Итог периода", formatMoney(SUMMARY.netProfit, { decimals: 2 }), "text-loss"],
    ["Сделок", String(SUMMARY.trades)],
    ["Прибыльных", `${SUMMARY.winRate.toLocaleString("ru-RU")} %`],
    ["Профит-фактор", SUMMARY.profitFactor.toLocaleString("ru-RU")],
    ["Матожидание сделки", formatMoney(SUMMARY.expectancy)],
    ["Ср. прибыль / убыток", `${formatMoney(SUMMARY.avgWin)} / ${formatMoney(SUMMARY.avgLoss)}`],
    ["Убытков подряд, макс.", String(SUMMARY.maxLossStreak)],
  ];
  return el("dl", { class: "self-start divide-y divide-line border-y border-line text-[14px]" },
    rows.map(([label, value, tone = ""]) => el("div", { class: "flex items-baseline justify-between gap-4 py-2.5" },
      el("dt", { class: "text-ink-2" }, label),
      el("dd", { class: `num text-right font-medium ${tone}` }, value))));
}

function curveSection() {
  const curve = el("div", { class: "mt-4", role: "img", "aria-describedby": "day-table", "aria-label": "График накопленного результата по дням" });
  const section = el("section", { "aria-labelledby": "curve-h", class: "mt-10 grid gap-8 lg:grid-cols-[1fr_300px]" },
    el("figure", { class: "min-w-0 rounded-md border border-line bg-surface p-5" },
      el("figcaption", { class: "flex flex-wrap items-baseline justify-between gap-2" },
        el("h2", { id: "curve-h", class: "text-[17px] font-semibold" }, "Накопленный результат"),
        el("span", { class: "flex items-center gap-2 text-[13px] text-ink-2" }, swatch(true, "h-2.5 w-2.5 !rounded-full"), "день с нарушением")),
      curve),
    kpiList());
  return { section, curve };
}

function rulesCell(day) {
  if (!day.broken.length) return el("span", { class: "text-ink-2" }, "соблюдены");
  return el("span", { class: "flex flex-wrap gap-1.5" }, day.broken.map((id) =>
    el("span", { class: "inline-flex items-center gap-1.5 rounded-sm border border-broken/60 px-2 py-0.5 text-[12px]" },
      el("span", { class: "hatch inline-block h-2 w-2 rounded-full" }), RULE_SHORT[id])));
}

function dayRow(day) {
  const { day: d, month, weekday } = formatDate(day.date);
  const tone = day.pnl < 0 ? "text-loss" : "text-gain";
  return el("tr", { "data-date": day.date, class: "border-b border-line last:border-0 transition-colors" },
    el("td", { class: "whitespace-nowrap px-3 py-2.5 sm:px-4" }, `${d} ${month}`, el("span", { class: "ml-1.5 text-ink-3" }, weekday)),
    el("td", { class: "num px-3 py-2.5 text-right sm:px-4" }, String(day.trades)),
    el("td", { class: "num hidden px-4 py-2.5 text-right text-ink-2 sm:table-cell" }, String(day.wins)),
    el("td", { class: `num whitespace-nowrap px-3 py-2.5 text-right font-medium sm:px-4 ${tone}` }, formatMoney(day.pnl)),
    el("td", { class: "px-3 py-2.5 sm:px-4" }, rulesCell(day)));
}

function tableSection() {
  const th = (text, cls = "") => el("th", { scope: "col", class: `px-3 py-3 font-medium sm:px-4 ${cls}` }, text);
  const body = el("tbody", {}, DAYS.map(dayRow));
  const section = el("section", { "aria-labelledby": "table-h", class: "mt-10" },
    el("h2", { id: "table-h", class: "text-[17px] font-semibold" }, "По дням"),
    el("div", { class: "mt-4 overflow-x-auto rounded-md border border-line bg-surface" },
      el("table", { id: "day-table", class: "w-full text-[14px] sm:min-w-[560px]" },
        el("thead", { class: "text-left text-[11px] uppercase tracking-[0.06em] text-ink-2 sm:text-[12px]" },
          el("tr", { class: "border-b border-line" },
            th("День"), th("Сделки", "text-right"), th("Прибыльные", "hidden text-right sm:table-cell"),
            th("Результат", "text-right"), th("Правила"))),
        body)));
  return { section, body };
}

function render(root) {
  const head = el("div", { class: "flex flex-wrap items-end justify-between gap-4" },
    pageHead("Период 24 фев — 30 мар", "Мои цифры"),
    el("a", { href: "report.html", class: BTN_PRIMARY }, "Отчёт за период"));
  const table = tableSection();
  const stripParts = stripSection((date) => selectDay(date));
  const curve = curveSection();

  function selectDay(date) {
    stripParts.strip.select(date);
    // Selection is shown by an action-coloured edge, not by background tint alone (1.4.11)
    table.body.querySelectorAll("tr").forEach((row) => {
      const selected = row.dataset.date === date;
      row.classList.toggle("bg-sunken", selected);
      row.classList.toggle("shadow-[inset_3px_0_0_rgb(var(--c-action))]", selected);
    });
    const day = DAYS.find((d) => d.date === date);
    if (day) stripParts.detail.textContent = describeDay(day);
  }

  root.append(head, splitSection(), stripParts.section, curve.section, table.section);
  selectDay(DAYS.reduce((a, b) => (b.pnl < a.pnl ? b : a)).date);
  return mountCurve(curve.curve);
}

export default Object.freeze({ title: "Мои цифры", render });
