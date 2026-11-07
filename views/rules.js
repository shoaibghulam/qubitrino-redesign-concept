/* «Правила» — the trader's own limits: switch, editable limit, violations over the period. */
import { DAYS, formatDate } from "../data.js";
import { el, pageHead, daysWord, plural } from "./dom.js";
import { RULE_KINDS, validateRule, violationDays } from "./rule-kinds.js";
import { getState, setRule, removeRule, subscribe } from "./store.js";
import { addRuleBlock } from "./rules-form.js";

const SWITCH = "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-3 bg-sunken transition-colors aria-checked:border-ink aria-checked:bg-ink";
const KNOB = "pointer-events-none absolute left-0.5 h-[18px] w-[18px] rounded-full shadow-sm transition-transform";

function ruleSwitch(rule, labelId) {
  const knob = el("span", { class: `${KNOB} ${rule.enabled ? "translate-x-5 bg-surface" : "bg-ink-3"}`, "aria-hidden": "true" });
  const btn = el("button", {
    type: "button", role: "switch", "aria-checked": String(rule.enabled), "aria-labelledby": labelId,
    "data-focus": `switch-${rule.id}`, class: SWITCH,
  }, knob);
  btn.addEventListener("click", () => setRule(rule.id, { enabled: !rule.enabled }));
  // 44px hit area around a 24px visual switch
  return el("span", { class: "grid h-11 w-14 shrink-0 place-items-center" }, btn);
}

/** Tiny per-day row: which of the 13 days this rule would have flagged */
function violationDots(hitDates) {
  return el("span", { class: "flex gap-1", "aria-hidden": "true" },
    DAYS.map((d) => el("span", {
      class: `h-3 w-2 rounded-[2px] ${hitDates.has(d.date) ? "hatch" : "bg-line"}`,
      title: `${formatDate(d.date).day} ${formatDate(d.date).month}`,
    })));
}

function limitField(rule, announce) {
  const def = RULE_KINDS[rule.kind];
  const id = `limit-${rule.id}`;
  const error = el("p", { id: `${id}-err`, class: "mt-1 hidden text-[12px] font-medium text-loss" });
  const input = el("input", {
    id, value: String(rule.limit).replace(".", ","), inputmode: "decimal", autocomplete: "off",
    "data-focus": id, "aria-describedby": `${id}-err`,
    class: "num h-10 w-24 rounded-sm border border-line bg-surface px-2 text-right text-[14px] aria-[invalid=true]:border-loss",
  });
  const commit = () => {
    const others = getState().rules.filter((r) => r.id !== rule.id);
    const result = validateRule({ kind: rule.kind, limit: input.value }, others);
    error.textContent = result.errors.limit ?? "";
    error.classList.toggle("hidden", result.ok);
    input.setAttribute("aria-invalid", String(!result.ok));
    if (result.ok && result.value.limit !== rule.limit) {
      setRule(rule.id, { limit: result.value.limit });
      announce(`Лимит обновлён: ${def.label(result.value.limit)}.`);
    }
  };
  input.addEventListener("change", commit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") commit(); });
  return el("div", { class: "sm:text-right" },
    el("label", { for: id, class: "flex items-center gap-2 text-[13px] text-ink-2 sm:justify-end" }, "Лимит", input, el("span", { class: "w-12 text-left" }, def.unit)),
    error);
}

function ruleRow(rule, announce) {
  const def = RULE_KINDS[rule.kind];
  const labelId = `rule-${rule.id}`;
  const hits = violationDays(rule.kind, rule.limit);
  const count = hits.length;
  const remove = el("button", { type: "button", "data-focus": `rm-${rule.id}`, class: "h-10 rounded-sm px-2 text-[13px] text-ink-2 underline-offset-4 hover:text-loss hover:underline" }, "Удалить");
  remove.addEventListener("click", () => { removeRule(rule.id); announce(`Правило «${def.label(rule.limit)}» удалено.`); });
  return el("li", { class: `grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 py-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center ${rule.enabled ? "" : "text-ink-2"}` },
    ruleSwitch(rule, labelId),
    el("div", { class: "min-w-0" },
      el("p", { id: labelId, class: "text-[15px] font-medium" }, def.label(rule.limit)),
      el("p", { class: "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2" },
        violationDots(new Set(hits.map((d) => d.date))),
        count ? `нарушено в ${count} ${plural(count, "день", "дня", "дней")} из ${DAYS.length}` : "ни одного нарушения за период",
        rule.enabled ? null : el("span", { class: "rounded-sm bg-sunken px-1.5 py-0.5 text-[12px]" }, "выключено"))),
    // Phones: limit and delete share one row; ≥640px they become their own grid columns
    el("div", { class: "col-start-2 flex items-start justify-between gap-3 sm:contents" }, limitField(rule, announce), remove));
}

function emptyRules() {
  return el("li", { class: "py-10 text-center" },
    el("p", { class: "text-[17px] font-semibold" }, "Правил нет"),
    el("p", { class: "mx-auto mt-1 max-w-[42ch] text-[14px] text-ink-2" }, "Без правил кабинет покажет только деньги, но не поведение. Начните с лимита сделок в день."));
}

function render(root) {
  const status = el("p", { role: "status", class: "min-h-[20px] text-[13px] text-ink-2" });
  const list = el("ul", { class: "mt-4 divide-y divide-line border-y border-line", "aria-label": "Ваши правила" });
  const announce = (text) => { status.textContent = text; };

  const paint = (state) => {
    const focusKey = document.activeElement?.dataset?.focus;
    list.replaceChildren(...(state.rules.length ? state.rules.map((r) => ruleRow(r, announce)) : [emptyRules()]));
    if (!focusKey) return;
    // A deleted rule takes its button with it — land on the list heading instead of <body>
    const target = list.querySelector(`[data-focus="${focusKey}"]`) ?? document.getElementById("rules-list-h");
    target?.focus();
  };

  root.append(
    pageHead("Ваши ограничения", "Правила",
      `Правило — обещание самому себе. Счётчики посчитаны по сделкам за 24 фев — 30 мар (${daysWord(DAYS.length)}). Изменения применяются к новым дням и не переписывают прошлые отметки.`),
    el("div", { class: "mt-6 flex flex-wrap items-center justify-between gap-2" },
      el("h2", { id: "rules-list-h", tabindex: "-1", class: "text-[17px] font-semibold focus:outline-none" }, "Список правил"), status),
    list,
    el("p", { class: "mt-3 flex items-center gap-2 text-[13px] text-ink-2" },
      el("span", { class: "hatch inline-block h-3 w-2 shrink-0 rounded-[2px]", "aria-hidden": "true" }),
      "Каждая клетка — торговый день периода, штриховка — день, когда правило нарушено (или было бы нарушено, если оно выключено)."),
    addRuleBlock(announce));
  paint(getState());
  return subscribe(paint);
}

export default Object.freeze({ title: "Правила", render });
