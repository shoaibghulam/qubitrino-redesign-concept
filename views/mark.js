/* «Отметка дня» — a one-minute daily check-in: plan, state, note. */
import { TODAY, formatDate, formatMoney } from "../data.js";
import { el, icon, pageHead, swatch, tradesWord, BTN_PRIMARY, BTN_QUIET } from "./dom.js";
import { getState, saveMark } from "./store.js";
import { PLAN, MOODS, historySection } from "./mark-history.js";
import { currentDays } from "./rule-kinds.js";

const NOTE_MAX = 500;
const NOTE_WARN = 50; // counter turns into «осталось N» below this many characters
const VALIDATED = Object.freeze(["plan", "mood"]);
const CARD = "relative flex min-h-[72px] cursor-pointer flex-col justify-center rounded-md border border-line bg-surface px-4 py-3 hover:border-ink-3 has-[:checked]:border-ink has-[:checked]:shadow-[inset_0_0_0_1px_rgb(var(--c-ink))] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper";
const STEP = "flex h-12 cursor-pointer items-center justify-center rounded-sm border border-line bg-surface text-[15px] hover:border-ink-3 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper";

const todayLabel = () => { const { day, month, weekday } = formatDate(TODAY); return `${weekday}, ${day} ${month}`; };

function legend(text, id) {
  return el("legend", { id, class: "text-[15px] font-semibold" }, text);
}

function errorLine(id) {
  return el("p", { id, role: "alert", class: "mt-2 hidden items-center gap-1.5 text-[13px] font-medium text-loss" }, icon("alert", 16), el("span"));
}

function planFieldset(saved) {
  return el("fieldset", { "aria-describedby": "plan-err" },
    legend("Торговали по плану?"),
    el("div", { class: "mt-3 grid gap-2 sm:grid-cols-3" },
      Object.entries(PLAN).map(([value, { label, hint }]) => el("label", { class: CARD },
        el("input", { type: "radio", name: "plan", value, class: "sr-only", checked: saved?.plan === value }),
        el("span", { class: "text-[15px] font-medium" }, label),
        el("span", { class: "mt-0.5 text-[13px] text-ink-2" }, hint)))),
    errorLine("plan-err"));
}

function moodFieldset(saved) {
  return el("fieldset", { "aria-describedby": "mood-err" },
    legend("Состояние во время торговли"),
    el("div", { class: "mt-3 grid grid-cols-5 gap-1.5" },
      MOODS.map((name, i) => el("label", { class: STEP },
        el("input", { type: "radio", name: "mood", value: String(i + 1), class: "sr-only", checked: saved?.mood === i + 1, "aria-label": `${i + 1} — ${name}` }),
        el("span", { class: "num", "aria-hidden": "true" }, String(i + 1))))),
    el("p", { class: "mt-1.5 flex justify-between text-[12px] text-ink-2", "aria-hidden": "true" },
      el("span", {}, `1 — ${MOODS[0].toLowerCase()}`), el("span", { class: "text-right" }, `5 — ${MOODS[4].toLowerCase()}`)),
    errorLine("mood-err"));
}

function noteField(saved) {
  const counter = el("span", { id: "note-count", class: "num" });
  const area = el("textarea", {
    id: "note", name: "note", rows: "4", maxlength: String(NOTE_MAX), "aria-describedby": "note-count",
    placeholder: "Что повлияло на решения? Одна-две фразы.",
    class: "mt-3 block w-full resize-y rounded-sm border border-line bg-surface px-3 py-2.5 text-[14px] leading-relaxed placeholder:text-ink-3",
  });
  area.value = saved?.note ?? "";
  const sync = () => {
    const left = NOTE_MAX - area.value.length;
    const warn = left < NOTE_WARN;
    counter.textContent = warn ? `осталось ${left}` : `${area.value.length} / ${NOTE_MAX}`;
    counter.classList.toggle("text-loss", warn);
    counter.classList.toggle("font-medium", warn);
  };
  area.addEventListener("input", sync);
  sync();
  return el("div", {},
    el("div", { class: "flex items-baseline justify-between gap-3" },
      el("label", { for: "note", class: "text-[15px] font-semibold" }, "Заметка ", el("span", { class: "font-normal text-ink-2" }, "— необязательно")),
      el("span", { class: "text-[12px] text-ink-2" }, counter)),
    area);
}

function showError(form, id, message) {
  const node = form.querySelector(`#${id}`);
  if (!node) return;
  node.lastChild.textContent = message ?? "";
  node.classList.toggle("hidden", !message);
  node.classList.toggle("flex", Boolean(message));
}

function readForm(form) {
  const data = new FormData(form);
  return { plan: data.get("plan"), mood: Number(data.get("mood")) || null, note: String(data.get("note") ?? "").trim() };
}

function dayFacts(today) {
  const broken = today.broken.length > 0;
  return el("aside", { "aria-label": "Факты дня из отчёта", class: "self-start rounded-md lg:order-last bg-sunken px-5 py-4 text-[14px]" },
    el("p", { class: "text-[12px] font-medium uppercase tracking-[0.08em] text-ink-2" }, "Факты дня"),
    el("p", { class: `num mt-2 text-[28px] font-medium leading-none ${today.pnl < 0 ? "text-loss" : "text-gain"}` }, formatMoney(today.pnl)),
    el("p", { class: "mt-2 text-ink-2" }, `${tradesWord(today.trades)}, прибыльных ${today.wins}`),
    el("p", { class: "mt-3 flex items-center gap-2" }, swatch(broken), broken ? "Есть нарушения правил" : "Правила соблюдены"),
    el("p", { class: "mt-3 text-[13px] text-ink-2" }, "Отметка — про решения, не про деньги. Плюсовой день вне плана — всё равно день вне плана."));
}

function successState(mark, onEdit) {
  const edit = el("button", { type: "button", class: BTN_QUIET }, "Изменить отметку");
  edit.addEventListener("click", onEdit);
  return el("section", { "aria-labelledby": "done-h", class: "rounded-md border border-line bg-surface p-5 sm:p-6" },
    el("p", { class: "flex items-center gap-2 text-[13px] text-ink-2" }, icon("mark", 18), `Сохранено · ${todayLabel()}`),
    el("h2", { id: "done-h", tabindex: "-1", class: "mt-2 text-[22px] font-semibold tracking-tight focus:outline-none" }, "Отметка дня сделана"),
    el("dl", { class: "mt-4 grid gap-3 text-[14px] sm:grid-cols-3" },
      el("div", {}, el("dt", { class: "text-ink-2" }, "План"), el("dd", { class: "font-medium" }, PLAN[mark.plan].label)),
      el("div", {}, el("dt", { class: "text-ink-2" }, "Состояние"), el("dd", { class: "font-medium" }, `${mark.mood} из 5 — ${MOODS[mark.mood - 1].toLowerCase()}`)),
      el("div", {}, el("dt", { class: "text-ink-2" }, "Заметка"), el("dd", {}, mark.note || "—"))),
    el("div", { class: "mt-5 flex flex-wrap gap-2" }, el("a", { href: "#/week", class: BTN_PRIMARY }, "Открыть неделю"), edit));
}

function buildForm(onSaved) {
  const saved = getState().todayMark;
  const form = el("form", { novalidate: true, "aria-label": "Отметка дня", class: "grid gap-8" },
    planFieldset(saved), moodFieldset(saved), noteField(saved),
    el("div", {}, el("button", { type: "submit", class: `${BTN_PRIMARY} h-12 px-6` }, "Сохранить отметку")));
  form.addEventListener("change", (e) => {
    if (VALIDATED.includes(e.target.name)) showError(form, `${e.target.name}-err`, null);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = readForm(form);
    showError(form, "plan-err", value.plan ? null : "Выберите один вариант.");
    showError(form, "mood-err", value.mood ? null : "Оцените состояние от 1 до 5.");
    if (!value.plan) return form.querySelector('input[name="plan"]').focus();
    if (!value.mood) return form.querySelector('input[name="mood"]').focus();
    saveMark(value);
    onSaved();
  });
  return form;
}

function render(root) {
  const slot = el("div", { class: "min-w-0" });
  const showForm = () => { slot.replaceChildren(buildForm(showDone)); };
  const editMark = () => {
    showForm();
    (slot.querySelector("input:checked") ?? slot.querySelector("input"))?.focus();
  };
  function showDone() {
    slot.replaceChildren(successState(getState().todayMark, editMark));
    slot.querySelector("#done-h")?.focus();
  }
  root.append(
    pageHead(`Сегодня · ${todayLabel()}`, "Отметка дня", "Минута в конце дня. Из отметок складывается недельный обзор и сводка ИИ."),
    el("div", { class: "mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12" }, dayFacts(currentDays().find((d) => d.date === TODAY)), slot),
    historySection());
  if (getState().todayMark) slot.replaceChildren(successState(getState().todayMark, editMark));
  else showForm();
}

export default Object.freeze({ title: "Отметка дня", render });
