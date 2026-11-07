/* «Отчёты» — report builder with loading, ready, empty and error states. */
import { DAYS, formatDate, formatMoney } from "../data.js";
import { TRADES } from "../trades.js";
import { el, icon, pageHead, tradesWord, daysWord, BTN_PRIMARY, BTN_QUIET } from "./dom.js";
import { getState, addReport } from "./store.js";
import { TYPES, buildForm, readForm, setPeriodError, fillEmptyExample } from "./reports-form.js";

const LOADING_MS = 600;
let pending = null; // timer of an in-flight build, cleared when leaving the view

const short = (iso) => { const { day, month } = formatDate(iso); return `${day} ${month}`; };
const daysIn = ({ from, to }) => DAYS.filter((d) => d.date >= from && d.date <= to);

function emptyState() {
  return el("div", { class: "rounded-md border border-dashed border-line px-5 py-8 text-center" },
    el("p", { class: "text-[15px] font-semibold" }, "Отчётов пока нет"),
    el("p", { class: "mx-auto mt-1 max-w-[34ch] text-[13px] text-ink-2" }, "Выберите период и тип слева — готовый отчёт появится здесь и останется до конца сессии."));
}

function skeleton() {
  return el("li", { class: "rounded-md border border-line bg-surface p-4", "aria-hidden": "true" },
    el("div", { class: "skeleton h-4 w-2/3" }),
    el("div", { class: "skeleton mt-3 h-3 w-1/2" }),
    el("div", { class: "mt-4 flex items-end gap-1" }, [10, 26, 14, 30, 8, 18, 22].map((h) => el("div", { class: "skeleton w-3", style: `height:${h}px` }))));
}

function readyCard(report) {
  const t = TYPES[report.type];
  return el("li", { class: `rounded-md border bg-surface p-4 ${t.ai ? "border-ai/40" : "border-line"}` },
    el("p", { class: `flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.08em] ${t.ai ? "text-ai" : "text-ink-2"}` }, t.ai ? icon("spark", 14) : null, t.label),
    el("h3", { class: "mt-1 text-[15px] font-semibold" }, `${short(report.from)} — ${short(report.to)}`),
    el("p", { class: "mt-1 text-[13px] text-ink-2" },
      `${daysWord(report.days)} · ${tradesWord(report.trades)} · `, el("span", { class: `num ${report.pnl < 0 ? "text-loss" : "text-gain"}` }, formatMoney(report.pnl, { decimals: 2 }))),
    el("div", { class: "mt-3 flex flex-wrap items-center gap-3" },
      el("a", { href: "report.html", class: `${BTN_PRIMARY} h-9 px-3 text-[13px]` }, "Открыть отчёт"),
      el("span", { class: "text-[12px] text-ink-3" }, "A4 · печать в PDF")));
}

function errorCard(range, onFix) {
  const fix = el("button", { type: "button", class: `${BTN_QUIET} mt-3 h-9 text-[13px]` }, "Изменить период");
  fix.addEventListener("click", onFix);
  return el("div", { role: "alert", class: "rounded-md border border-loss/50 bg-loss/[0.05] p-4" },
    el("p", { class: "flex items-center gap-2 text-[15px] font-semibold" }, icon("alert", 18), "Не удалось сформировать отчёт"),
    el("p", { class: "mt-1 text-[13px] leading-relaxed text-ink-2" }, `С ${short(range.from)} по ${short(range.to)} нет ни одной сделки — отчёт не из чего собрать. Выберите период, в котором вы торговали.`),
    fix);
}

function listView(extra) {
  const reports = getState().reports;
  const items = [...(extra ? [extra] : []), ...reports.map(readyCard)];
  return items.length ? el("ol", { class: "grid gap-3", "aria-label": "Готовые отчёты" }, items) : emptyState();
}

function render(root) {
  const form = buildForm();
  const status = el("p", { role: "status", class: "sr-only" });
  const results = el("div", { class: "mt-3", "aria-live": "off" }, listView());
  const submit = el("button", { type: "submit", class: `${BTN_PRIMARY} h-12 px-6` }, "Сформировать");
  const example = el("button", { type: "button", class: "h-10 text-[13px] text-ink-2 underline underline-offset-4 hover:text-ink" }, "Пример ошибки: период без сделок");
  form.append(el("div", { class: "flex flex-wrap items-center gap-x-5 gap-y-2" }, submit, example));

  const fail = (range) => {
    results.replaceChildren(errorCard(range, () => form.querySelector('input[name="from"]').focus()), listView());
    status.textContent = "Ошибка: в выбранном периоде нет сделок.";
  };

  const build = (range) => {
    const days = daysIn(range);
    if (!days.length) return fail(range);
    submit.disabled = true;
    results.setAttribute("aria-busy", "true");
    results.replaceChildren(el("ol", { class: "grid gap-3" }, skeleton(), ...getState().reports.map(readyCard)));
    status.textContent = "Формируем отчёт…";
    pending = setTimeout(() => {
      // Money from the trades themselves (incl. swap) so the card matches «Мои сделки» to the kopeck
      const inRange = TRADES.filter((t) => t.close.slice(0, 10) >= range.from && t.close.slice(0, 10) <= range.to);
      addReport({ ...range, id: Date.now(), days: days.length, trades: inRange.length, pnl: inRange.reduce((s, t) => s + t.profit, 0) });
      submit.disabled = false;
      results.removeAttribute("aria-busy");
      results.replaceChildren(listView());
      status.textContent = `Отчёт готов: ${TYPES[range.type].label}, ${short(range.from)} — ${short(range.to)}.`;
    }, LOADING_MS);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = readForm(form);
    setPeriodError(form, value.error);
    if (value.error) return form.querySelector('input[name="from"]').focus();
    // Presets may reach past the data — clip to the trading period for the card
    build({ ...value, from: value.from < DAYS[0].date ? DAYS[0].date : value.from, to: value.to > DAYS.at(-1).date ? DAYS.at(-1).date : value.to });
  });
  example.addEventListener("click", () => { fillEmptyExample(form); submit.focus(); });

  root.append(
    pageHead("PDF для себя или наставника", "Отчёты", "Отчёт собирается из тех же данных, что и кабинет: сделки MT5, правила, отметки дней."),
    el("div", { class: "mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]" },
      el("section", { "aria-label": "Конструктор отчёта" }, form),
      el("section", { "aria-labelledby": "ready-h" }, el("h2", { id: "ready-h", class: "text-[17px] font-semibold" }, "Готовые отчёты"), results, status)));
  return () => { clearTimeout(pending); pending = null; };
}

export default Object.freeze({ title: "Отчёты", render });
