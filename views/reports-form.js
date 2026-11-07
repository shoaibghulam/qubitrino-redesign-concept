/* Report builder form: period presets or custom dates, report type, format note. */
import { DAYS } from "../data.js";
import { el, icon } from "./dom.js";

export const PERIOD_MIN = DAYS[0].date;
export const PERIOD_MAX = DAYS.at(-1).date;

export const PRESETS = Object.freeze({
  all: { label: "Весь период", from: PERIOD_MIN, to: PERIOD_MAX },
  mar: { label: "Март", from: "2026-03-01", to: "2026-03-31" },
  feb: { label: "Февраль", from: "2026-02-01", to: "2026-02-28" },
  week: { label: "Последняя неделя", from: "2026-03-24", to: PERIOD_MAX },
  custom: { label: "Свои даты" },
});

export const TYPES = Object.freeze({
  discipline: { label: "Дисциплина", hint: "Правила и результат, отметки дней, таблица по дням." },
  deals: { label: "Сделки", hint: "Все позиции периода с итогами по дням и направлению." },
  ai: { label: "Сводка с ИИ-анализом", hint: "Наблюдения о поведении: перегрузка сделками, объём после убытка.", ai: true },
});

const CHIP_RADIO = "inline-flex h-10 cursor-pointer items-center rounded-sm border border-line bg-surface px-3 text-[13px] hover:border-ink-3 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper";
const TYPE_CARD = "flex cursor-pointer gap-3 rounded-md border border-line bg-surface px-4 py-3 hover:border-ink-3 has-[:checked]:border-ink has-[:checked]:shadow-[inset_0_0_0_1px_rgb(var(--c-ink))] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper";
const DATE = "num h-10 w-full rounded-sm border border-line bg-surface px-3 text-[14px] aria-[invalid=true]:border-loss";

function periodFieldset() {
  const dates = el("div", { id: "custom-dates", class: "mt-3 hidden grid-cols-2 gap-3" },
    el("label", { class: "text-[13px] font-medium" }, "С", el("input", { type: "date", name: "from", min: PERIOD_MIN, max: PERIOD_MAX, class: `${DATE} mt-1.5`, "aria-describedby": "period-err" })),
    el("label", { class: "text-[13px] font-medium" }, "По", el("input", { type: "date", name: "to", min: PERIOD_MIN, max: PERIOD_MAX, class: `${DATE} mt-1.5`, "aria-describedby": "period-err" })));
  return el("fieldset", {},
    el("legend", { class: "text-[15px] font-semibold" }, "Период"),
    el("div", { class: "mt-3 flex flex-wrap gap-1.5" },
      Object.entries(PRESETS).map(([value, { label }]) => el("label", { class: CHIP_RADIO },
        el("input", { type: "radio", name: "preset", value, class: "sr-only", checked: value === "all" }), label))),
    dates,
    el("p", { id: "period-err", class: "mt-2 hidden text-[13px] font-medium text-loss" }));
}

function typeFieldset() {
  return el("fieldset", {},
    el("legend", { class: "text-[15px] font-semibold" }, "Что в отчёте"),
    el("div", { class: "mt-3 grid gap-2" },
      Object.entries(TYPES).map(([value, t]) => el("label", { class: TYPE_CARD },
        el("input", { type: "radio", name: "type", value, checked: value === "discipline", class: `mt-1 h-4 w-4 shrink-0 ${t.ai ? "accent-[rgb(var(--c-ai))]" : "accent-[rgb(var(--c-ink))]"}` }),
        el("span", {},
          el("span", { class: `flex items-center gap-1.5 text-[15px] font-medium ${t.ai ? "text-ai" : ""}` }, t.ai ? icon("spark", 16) : null, t.label),
          el("span", { class: "mt-0.5 block text-[13px] text-ink-2" }, t.hint))))));
}

function formatNote() {
  return el("p", { class: "flex gap-3 rounded-sm bg-sunken px-4 py-3 text-[13px] leading-relaxed text-ink-2" },
    icon("reports", 18),
    el("span", {}, "Формат — A4, книжная. PDF сохраняется через печать браузера: «Печать» → «Сохранить как PDF». Отчёт всегда печатается в светлой теме, нарушения видны и в ч/б — штриховкой."));
}

export function buildForm() {
  const form = el("form", { novalidate: true, "aria-labelledby": "builder-h", class: "grid gap-7" },
    el("h2", { id: "builder-h", class: "sr-only" }, "Параметры отчёта"),
    periodFieldset(), typeFieldset(), formatNote());
  form.addEventListener("change", (e) => {
    if (e.target.name !== "preset") return;
    const custom = e.target.value === "custom";
    const dates = form.querySelector("#custom-dates");
    dates.classList.toggle("hidden", !custom);
    dates.classList.toggle("grid", custom);
    setPeriodError(form, null);
  });
  return form;
}

export function setPeriodError(form, message) {
  const node = form.querySelector("#period-err");
  node.textContent = message ?? "";
  node.classList.toggle("hidden", !message);
  form.querySelectorAll("input[type=date]").forEach((i) => i.setAttribute("aria-invalid", String(Boolean(message))));
}

/** Reads and validates the form. Returns { error } or { from, to, type, preset } */
export function readForm(form) {
  const data = new FormData(form);
  const preset = data.get("preset");
  const type = data.get("type");
  if (preset !== "custom") return { ...PRESETS[preset], preset, type };
  const from = data.get("from");
  const to = data.get("to");
  if (!from || !to) return { error: "Укажите обе даты." };
  if (from > to) return { error: "Дата «с» позже даты «по»." };
  if (to < PERIOD_MIN || from > PERIOD_MAX) return { error: "Данные есть только за 24 фев — 30 мар 2026." };
  return { from, to, preset, type };
}

/** Fills the custom dates with a range that has no trades — to show the error state */
export function fillEmptyExample(form) {
  form.querySelector('input[value="custom"]').click();
  form.querySelector('input[name="from"]').value = "2026-03-03";
  form.querySelector('input[name="to"]').value = "2026-03-10";
}
