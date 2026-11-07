/*
  Controls: buttons, inputs, switch, radio cards.
  Each demo node is built once; its snippet is the serialised default state.
*/
import { el, svg, serialize } from "./dom.js";
import { icon } from "./icons.js";

const BTN_BASE = "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45";
const FOCUS_FORCED = "outline outline-2 outline-offset-2 outline-action";

const VARIANTS = Object.freeze([
  { key: "primary", name: "Основная", text: "Сохранить", cls: "bg-action text-on-action", hover: "bg-action/90" },
  { key: "secondary", name: "Вторичная", text: "Отчёт за период", cls: "border border-line bg-surface text-ink", hover: "border-ink-3" },
  { key: "ghost", name: "Тихая", text: "Отмена", cls: "text-ink-2", hover: "bg-sunken text-ink" },
  { key: "destructive", name: "Опасная", text: "Удалить", cls: "border border-loss/50 bg-surface text-loss", hover: "bg-loss/10" },
]);

const STATES = Object.freeze(["обычная", "наведение", "фокус", "недоступна", "загрузка"]);

function spinner() {
  const root = svg("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", class: "motion-safe:animate-spin" });
  root.append(svg("circle", { cx: 12, cy: 12, r: 9, stroke: "currentColor", "stroke-width": 2.2, opacity: 0.25 }));
  root.append(svg("path", { d: "M21 12a9 9 0 0 0-9-9", stroke: "currentColor", "stroke-width": 2.2, "stroke-linecap": "round" }));
  return root;
}

function button(v, state = "обычная") {
  const hoverCls = v.hover.split(" ").map((c) => `hover:${c}`).join(" ");
  const forced = { "наведение": v.hover, "фокус": FOCUS_FORCED }[state] ?? "";
  const loading = state === "загрузка";
  return el("button", {
    type: "button",
    class: `${BTN_BASE} ${v.cls} ${forced || hoverCls}`.trim(),
    disabled: state === "недоступна" || loading,
    "aria-busy": loading ? "true" : null,
  }, loading ? [spinner(), v.text] : v.text);
}

function buttonMatrix() {
  const head = el("tr", {}, el("td", {}), STATES.map((s) =>
    el("th", { scope: "col", class: "px-2 pb-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-ink-2" }, s)));
  const rows = VARIANTS.map((v) => el("tr", {},
    el("th", { scope: "row", class: "pr-4 text-left text-[13px] font-medium text-ink-2" }, v.name),
    STATES.map((s) => el("td", { class: "p-2" }, button(v, s)))));
  return el("div", { class: "relative -m-2 overflow-x-auto p-2", role: "region", tabindex: "0", "aria-label": "Кнопки: варианты и состояния" },
    el("table", { class: "border-separate border-spacing-0" },
      el("caption", { class: "sr-only" }, "Варианты кнопок по строкам, состояния по столбцам"),
      el("thead", {}, head), el("tbody", {}, rows)));
}

export function buttonsSpec() {
  return {
    id: "cmp-button", title: "Кнопки", open: true,
    lede: "Одна основная кнопка на экран. Синий — только у неё: синий значит «можно нажать», а не «важно». Высота 40px, радиус 6.",
    demo: buttonMatrix(),
    notes: [
      "Фокус — кольцо 2px action со смещением 2px из tokens.css; наведение и фокус здесь показаны принудительно.",
      "Загрузка: disabled + aria-busy, спиннер встаёт перед текстом, подпись не меняется — экранный диктор слышит «занято».",
      "Опасная — контурная: удаление правила обратимо, кричать нечем.",
    ],
    snippet: serialize(...VARIANTS.map((v) => button(v))),
  };
}

/* ---------- Inputs ---------- */

const INPUT = "h-10 w-full rounded-sm border border-ink-3/80 bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 hover:border-ink-2 transition-colors";
const INPUT_ERR = "h-10 w-full rounded-sm border-2 border-loss bg-surface px-3 text-[14px] text-ink";

function field(id, labelText, control, help, error = false) {
  const helpEl = help
    ? el("p", { id: `${id}-help`, class: `mt-1.5 flex items-start gap-1.5 text-[13px] ${error ? "text-loss" : "text-ink-2"}` },
      error ? icon("alert", 16, "mt-0.5") : null, help)
    : null;
  return el("div", {},
    el("label", { for: id, class: "block text-[13px] font-medium" }, labelText),
    el("div", { class: "relative mt-1.5" }, control),
    helpEl);
}

function moneyInput(id, value, error) {
  return [
    el("input", {
      id, type: "text", inputmode: "decimal", autocomplete: "off", value,
      class: `${error ? INPUT_ERR : INPUT} num pr-9 text-right`,
      "aria-describedby": `${id}-help`, "aria-invalid": error ? "true" : null,
    }),
    el("span", { class: "pointer-events-none absolute inset-y-0 right-3 flex items-center text-[14px] text-ink-2", "aria-hidden": "true" }, "₽"),
  ];
}

function selectInput(id) {
  return [
    el("select", { id, class: `${INPUT} appearance-none pr-9` },
      ["GBPUSD", "EURUSD", "XAUUSD"].map((s) => el("option", {}, s))),
    el("span", { class: "pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-2" }, icon("chevron-down", 16)),
  ];
}

function textareaWithCounter(id, max) {
  const area = el("textarea", {
    id, rows: "3", maxlength: String(max), "aria-describedby": `${id}-count`,
    class: `${INPUT} h-auto resize-y py-2 leading-relaxed`,
    placeholder: "Что было до первой сделки? Что заставило продолжить?",
  });
  const count = el("p", { id: `${id}-count`, class: "num mt-1.5 text-right text-[12px] text-ink-2" }, `0 / ${max}`);
  area.addEventListener("input", () => { count.textContent = `${area.value.length} / ${max}`; });
  return el("div", {},
    el("label", { for: id, class: "block text-[13px] font-medium" }, "Заметка к дню"),
    el("div", { class: "mt-1.5" }, area), count);
}

export function inputsSpec() {
  const text = field("ds-rule-name", "Название правила",
    el("input", { id: "ds-rule-name", type: "text", value: "Не больше 10 сделок в день", class: INPUT, "aria-describedby": "ds-rule-name-help" }),
    "Как вы скажете себе вслух. Видно в отчёте.");
  const money = field("ds-loss", "Дневной лимит убытка", moneyInput("ds-loss", "2 000", false), "После лимита день помечается как нарушение.");
  const moneyErr = field("ds-loss-err", "Дневной лимит убытка", moneyInput("ds-loss-err", "−2 000", true), "Введите сумму без минуса — это лимит, а не результат.", true);
  const select = field("ds-symbol", "Инструмент", selectInput("ds-symbol"), null);
  const demo = el("div", { class: "grid gap-6 sm:grid-cols-2" }, text, select, money, moneyErr, el("div", { class: "sm:col-span-2" }, textareaWithCounter("ds-note", 280)));
  return {
    id: "cmp-input", title: "Поля ввода",
    lede: "Метка всегда над полем и всегда видна. Плейсхолдер — пример, не инструкция. Числа в полях — моноширинные и по правому краю, единица — справа внутри поля.",
    demo,
    notes: [
      "Ошибка: граница 2px loss + иконка + текст, aria-invalid и aria-describedby — цвет никогда не единственный сигнал.",
      "Деньги — type=\"text\" inputmode=\"decimal\": type=\"number\" не принимает запятую и пробелы-разделители.",
      "Счётчик связан через aria-describedby и не объявляется на каждый символ.",
    ],
    snippet: serialize(money, moneyErr),
  };
}

/* ---------- Switch ---------- */

function switchControl(id, labelText, desc, on) {
  const thumb = el("span", { class: "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform duration-200 group-aria-checked:translate-x-4" });
  const track = el("span", { class: "relative h-6 w-10 shrink-0 rounded-full bg-ink-3/80 transition-colors group-aria-checked:bg-action", "aria-hidden": "true" }, thumb);
  const btn = el("button", {
    type: "button", role: "switch", "aria-checked": String(on), "aria-labelledby": `${id}-l`, "aria-describedby": `${id}-d`,
    class: "group flex min-h-10 w-full items-center justify-between gap-6 rounded-sm py-2 text-left",
  }, el("span", {},
    el("span", { id: `${id}-l`, class: "block text-[14px] font-medium" }, labelText),
    el("span", { id: `${id}-d`, class: "mt-0.5 block text-[13px] text-ink-2" }, desc)), track);
  btn.addEventListener("click", () => btn.setAttribute("aria-checked", String(btn.getAttribute("aria-checked") !== "true")));
  return btn;
}

export function switchSpec() {
  const a = switchControl("ds-sw1", "Напоминать об отметке дня", "В 19:00 по Москве, если день ещё не отмечен", true);
  const b = switchControl("ds-sw2", "Предупреждать на 8-й сделке", "За две сделки до лимита «≤ 10 в день»", false);
  return {
    id: "cmp-switch", title: "Переключатель",
    lede: "Для настроек, которые действуют сразу, без кнопки «Сохранить». Вся строка — цель нажатия.",
    demo: el("div", { class: "max-w-[520px] divide-y divide-line" }, a, b),
    notes: ["role=\"switch\" + aria-checked; состояние читается по положению ручки, не только по цвету. Анимируется transform."],
    snippet: serialize(a),
  };
}

/* ---------- Radio cards ---------- */

function radioCard(value, title, desc, checked) {
  return el("label", { class: "flex min-h-10 cursor-pointer items-start gap-3 rounded-md border border-line bg-surface p-4 transition-colors hover:border-ink-3 has-[:checked]:border-action has-[:checked]:shadow-[inset_0_0_0_1px_rgb(var(--c-action))]" },
    el("input", { type: "radio", name: "ds-period", value, checked, class: "mt-0.5 h-4 w-4 accent-action" }),
    el("span", {},
      el("span", { class: "block text-[14px] font-medium" }, title),
      el("span", { class: "mt-0.5 block text-[13px] text-ink-2" }, desc)));
}

export function radioSpec() {
  const cards = [
    radioCard("week", "Неделя", "Пн–пт, итог в пятницу вечером", true),
    radioCard("month", "Месяц", "Календарный месяц, для отчёта наставнику", false),
    radioCard("custom", "Свой период", "Например, 24.02 — 30.03.2026", false),
  ];
  const fieldset = el("fieldset", {},
    el("legend", { class: "text-[13px] font-medium" }, "Период отчёта"),
    el("div", { class: "mt-2 grid gap-3 sm:grid-cols-3" }, cards));
  return {
    id: "cmp-radio", title: "Радио-карточки",
    lede: "Когда у вариантов есть пояснение. Без пояснения — обычные радиокнопки списком.",
    demo: fieldset,
    notes: ["Нативный input type=\"radio\": стрелки, фокус и форма работают без JS. Выбор — граница 2px action (has-[:checked])."],
    snippet: serialize(cards[0]),
  };
}
