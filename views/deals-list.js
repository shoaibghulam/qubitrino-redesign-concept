/* Rendering for «Мои сделки»: a sortable table on ≥640px, stacked rows on phones, pagination. */
import { formatDate, formatMoney } from "../data.js";
import { el, icon } from "./dom.js";

const SIDE = Object.freeze({ buy: "Покупка", sell: "Продажа" });

export const COLUMNS = Object.freeze([
  { key: "open", label: "Открыта", sortable: true },
  { key: "symbol", label: "Символ" },
  { key: "type", label: "Тип" },
  { key: "volume", label: "Объём", sortable: true, right: true },
  { key: "openPrice", label: "Цена откр.", right: true },
  { key: "close", label: "Закрыта", sortable: true },
  { key: "closePrice", label: "Цена закр.", right: true },
  { key: "profit", label: "Результат", sortable: true, right: true },
]);

export function when(iso) {
  const { day, month } = formatDate(iso.slice(0, 10));
  return `${day} ${month}, ${iso.slice(11, 16)}`;
}
const price = (v) => v.toLocaleString("ru-RU", { minimumFractionDigits: 5, maximumFractionDigits: 6 });
const lots = (v) => v.toLocaleString("ru-RU", { minimumFractionDigits: 2 });
const tone = (v) => (v < 0 ? "text-loss" : "text-gain");

function sideBadge(type) {
  return el("span", { class: "inline-flex items-center gap-1.5 text-[13px]" },
    el("span", { class: `inline-block h-1.5 w-1.5 rounded-full ${type === "buy" ? "bg-ink" : "border border-ink"}`, "aria-hidden": "true" }),
    SIDE[type]);
}

function headerCell(col, sort, onSort) {
  const align = col.right ? "text-right" : "text-left";
  if (!col.sortable) return el("th", { scope: "col", class: `px-3 py-3 font-medium ${align}` }, col.label);
  const active = sort.key === col.key;
  const btn = el("button", {
    type: "button", "data-key": `sort-${col.key}`,
    class: `inline-flex min-h-8 items-center gap-1 rounded-sm uppercase tracking-[0.06em] hover:text-ink ${active ? "text-ink" : ""} ${col.right ? "flex-row-reverse" : ""}`,
  }, col.label, icon("sort", 14));
  btn.addEventListener("click", () => onSort(col.key));
  return el("th", {
    scope: "col", class: `px-3 py-2 font-medium ${align}`,
    "aria-sort": active ? (sort.dir === "asc" ? "ascending" : "descending") : "none",
  }, btn);
}

function tableRow(t) {
  const td = (content, cls = "") => el("td", { class: `whitespace-nowrap px-3 py-2.5 ${cls}` }, content);
  return el("tr", { class: "border-b border-line last:border-0 hover:bg-sunken/60" },
    td(when(t.open)), td(t.symbol, "text-ink-2"), td(sideBadge(t.type)),
    td(lots(t.volume), "num text-right"), td(price(t.openPrice), "num text-right text-ink-2"),
    td(when(t.close)), td(price(t.closePrice), "num text-right text-ink-2"),
    td(formatMoney(t.profit, { decimals: 2 }), `num text-right font-medium ${tone(t.profit)}`));
}

export function dealsTable(rows, sort, onSort) {
  return el("div", { class: "hidden overflow-x-auto rounded-md border border-line bg-surface sm:block" },
    el("table", { class: "w-full min-w-[820px] text-[14px]" },
      el("caption", { class: "sr-only" }, "Сделки за период. Кнопки в заголовках сортируют таблицу."),
      el("thead", { class: "text-[11px] uppercase tracking-[0.06em] text-ink-2" },
        el("tr", { class: "border-b border-line" }, COLUMNS.map((c) => headerCell(c, sort, onSort)))),
      el("tbody", { class: "num-cells" }, rows.map(tableRow))));
}

/** Phones: one stacked row per trade — the result is the anchor, prices are secondary */
export function dealsStack(rows) {
  return el("ul", { class: "divide-y divide-line border-y border-line sm:hidden", "aria-label": "Сделки" },
    rows.map((t) => el("li", { class: "py-3" },
      el("div", { class: "flex items-baseline justify-between gap-3" },
        el("span", { class: "flex items-baseline gap-3" }, sideBadge(t.type), el("span", { class: "num text-[13px] text-ink-2" }, `${lots(t.volume)} лота`)),
        el("span", { class: `num text-[16px] font-medium ${tone(t.profit)}` }, formatMoney(t.profit, { decimals: 2 }))),
      el("p", { class: "num mt-1 text-[12px] text-ink-2" },
        `${when(t.open)} → ${t.close.slice(0, 10) === t.open.slice(0, 10) ? t.close.slice(11, 16) : when(t.close)}`),
      el("p", { class: "num text-[12px] text-ink-3" }, `${t.symbol} · ${price(t.openPrice)} → ${price(t.closePrice)}`))));
}

const PAGE_BTN = "grid h-10 min-w-10 place-items-center rounded-sm px-2 text-[14px] hover:bg-sunken disabled:opacity-40 disabled:hover:bg-transparent aria-[current=page]:bg-ink aria-[current=page]:text-paper";
const STEP_BTN = "h-10 shrink-0 rounded-sm px-3 text-[14px] hover:bg-sunken disabled:opacity-40";

function pageButton(label, page, current, onPage, extra = {}) {
  const btn = el("button", { type: "button", class: PAGE_BTN, "aria-current": current ? "page" : null, ...extra }, label);
  btn.addEventListener("click", () => onPage(page));
  return btn;
}

/** Numbered pages from 640px; on phones «Назад · стр. 3 из 6 · Вперёд» so the pager never overflows */
export function pagination(page, pages, onPage) {
  if (pages <= 1) return null;
  const numbers = Array.from({ length: pages }, (_, i) =>
    pageButton(el("span", { class: "num" }, String(i + 1)), i, i === page, onPage, { "aria-label": `Страница ${i + 1}`, "data-key": `page-${i}` }));
  return el("nav", { "aria-label": "Страницы сделок", class: "mt-4 flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-end" },
    pageButton("Назад", page - 1, false, onPage, { disabled: page === 0, class: STEP_BTN, "data-key": "prev" }),
    el("span", { class: "num text-[13px] text-ink-2 sm:hidden", "aria-current": "page" }, `стр. ${page + 1} из ${pages}`),
    el("span", { class: "hidden items-center gap-1 sm:flex" }, numbers),
    pageButton("Вперёд", page + 1, false, onPage, { disabled: page === pages - 1, class: STEP_BTN, "data-key": "next" }));
}
