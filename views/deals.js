/* «Мои сделки» — all 138 positions from the MT5 report with filters, sorting and pages. */
import { formatDate, formatMoney } from "../data.js";
import { TRADES } from "../trades.js";
import { el, icon, pageHead, tradesWord, CHIP, BTN_QUIET } from "./dom.js";
import { dealsTable, dealsStack, pagination } from "./deals-list.js";

const PAGE_SIZE = 25;

const FILTERS = Object.freeze({
  range: { label: "Период", options: [["all", "Весь период"], ["last7", "24–30 мар"], ["mar", "Март"], ["feb", "Февраль"]] },
  side: { label: "Направление", options: [["all", "Все"], ["buy", "Покупки"], ["sell", "Продажи"]] },
  outcome: { label: "Результат", options: [["all", "Все"], ["win", "Прибыльные"], ["loss", "Убыточные"]] },
});

const RANGE_TEST = Object.freeze({
  all: () => true,
  last7: (t) => t.close >= "2026-03-24",
  mar: (t) => t.close.startsWith("2026-03"),
  feb: (t) => t.close.startsWith("2026-02"),
});

const INITIAL = Object.freeze({ day: null, range: "all", side: "all", outcome: "all", sort: Object.freeze({ key: "open", dir: "desc" }), page: 0 });
const TRADE_DATES = new Set(TRADES.map((t) => t.close.slice(0, 10)));
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Survives navigation between sections within the visit
let state = INITIAL;

function applyFilters(s) {
  return TRADES.filter((t) => (s.day ? t.close.startsWith(s.day) : RANGE_TEST[s.range](t))
    && (s.side === "all" || t.type === s.side)
    && (s.outcome === "all" || (s.outcome === "win" ? t.profit > 0 : t.profit < 0)));
}

function applySort(rows, { key, dir }) {
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : a.id - b.id) * factor);
}

function filterGroup(name, onChange) {
  const { label, options } = FILTERS[name];
  const buttons = options.map(([value, text]) => {
    const btn = el("button", { type: "button", class: CHIP, "data-value": value, "data-key": `${name}-${value}`, "aria-pressed": String(state[name] === value) }, text);
    btn.addEventListener("click", () => onChange(name, value));
    return btn;
  });
  const group = el("div", { role: "group", "aria-label": label, class: "flex flex-wrap gap-1.5" }, buttons);
  // A day picked from «Главная» overrides the period, so no period chip is pressed meanwhile
  const pressed = (value) => state[name] === value && !(name === "range" && state.day);
  const sync = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(pressed(b.dataset.value))));
  return { node: el("div", {}, el("p", { class: "mb-1.5 text-[12px] text-ink-2" }, label), group), sync };
}

function summary(rows) {
  if (!rows.length) return "Ни одной сделки под эти фильтры";
  const total = rows.reduce((s, t) => s + t.profit, 0);
  const wins = rows.filter((t) => t.profit > 0).length;
  return `${tradesWord(rows.length)} · итог ${formatMoney(total, { decimals: 2 })} · прибыльных ${Math.round((wins / rows.length) * 100)}\u00A0%`;
}

/** «?day=YYYY-MM-DD» from the route (link «Сделки дня» on the home screen); ignored unless a trading day */
function dayFromHash() {
  const day = new URLSearchParams(location.hash.split("?")[1] ?? "").get("day");
  return day && DAY_RE.test(day) && TRADE_DATES.has(day) ? day : null;
}

function dayChip(onClear) {
  const wrap = el("div", { class: "self-end" });
  const sync = () => {
    if (!state.day) return wrap.replaceChildren();
    const { day, month } = formatDate(state.day);
    const clear = el("button", { type: "button", class: `${CHIP} gap-2 border-ink text-ink`, "data-key": "day-clear", "aria-label": `Снять фильтр: день ${day} ${month}` },
      `День: ${day} ${month}`, icon("close", 16));
    clear.addEventListener("click", onClear);
    return wrap.replaceChildren(clear);
  };
  return { node: wrap, sync };
}

/** Focus survives a repaint: the control with the same data-key gets it back */
function restoreFocus(container, key, fallbackKey) {
  if (!key) return;
  const find = (k) => container.querySelector(`[data-key="${k}"]:not([disabled])`);
  (find(key) ?? find(fallbackKey))?.focus({ preventScroll: true });
}

function emptyState(onReset) {
  const reset = el("button", { type: "button", "data-key": "reset", class: `${BTN_QUIET} mt-4` }, "Сбросить фильтры");
  reset.addEventListener("click", onReset);
  return el("div", { class: "rounded-md border border-dashed border-line px-6 py-10 text-center" },
    el("p", { class: "text-[17px] font-semibold" }, "Сделок не найдено"),
    el("p", { class: "mx-auto mt-1 max-w-[44ch] text-[14px] text-ink-2" }, "С 24 по 30 марта, например, не было ни одной продажи. Ослабьте фильтры или начните заново."),
    reset);
}

function rangeText(page, total) {
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  return `Показаны ${from}–${to} из ${total}`;
}

function render(root) {
  const results = el("div", { class: "mt-4" });
  const status = el("p", { class: "num text-[14px] font-medium", role: "status" });
  const groups = {};
  const linkedDay = dayFromHash();
  if (linkedDay) state = Object.freeze({ ...INITIAL, day: linkedDay });

  const setState = (patch) => {
    const key = document.activeElement?.dataset?.key;
    state = Object.freeze({ ...state, ...patch });
    paint();
    // Reset removes its own button — the first period chip is the closest equivalent
    restoreFocus(root, key === "reset" || key === "day-clear" ? "range-all" : key, `page-${state.page}`);
  };
  const onFilter = (name, value) => setState({ [name]: value, page: 0, ...(name === "range" ? { day: null } : {}) });
  const onSort = (key) => setState({
    sort: Object.freeze({ key, dir: state.sort.key === key && state.sort.dir === "desc" ? "asc" : "desc" }), page: 0,
  });
  const onPage = (page) => { setState({ page }); status.scrollIntoView({ block: "start" }); };

  function paint() {
    Object.values(groups).forEach((g) => g.sync());
    chip.sync();
    const rows = applySort(applyFilters(state), state.sort);
    const pages = Math.ceil(rows.length / PAGE_SIZE);
    const visible = rows.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
    status.textContent = summary(rows);
    if (!rows.length) return results.replaceChildren(emptyState(() => setState(INITIAL)));
    results.replaceChildren(
      dealsTable(visible, state.sort, onSort), dealsStack(visible),
      el("div", { class: "mt-3 flex flex-wrap items-center justify-between gap-2" },
        el("p", { class: "num text-[13px] text-ink-2" }, rangeText(state.page, rows.length)),
        pagination(state.page, pages, onPage)));
  }

  Object.keys(FILTERS).forEach((name) => { groups[name] = filterGroup(name, onFilter); });
  const chip = dayChip(() => setState({ day: null, page: 0 }));
  root.append(
    pageHead("Из отчёта MT5", "Мои сделки", "Позиции за 24 фев — 30 мар 2026: GBPUSD — 100, NZDUSD — 31, EURUSD — 7."),
    el("section", { "aria-label": "Фильтры", class: "mt-6 flex flex-wrap gap-x-8 gap-y-4 border-y border-line py-4" },
      Object.values(groups).map((g) => g.node), chip.node),
    el("div", { class: "mt-5 scroll-mt-4" }, status),
    results);
  paint();
}

export default Object.freeze({ title: "Мои сделки", render });
