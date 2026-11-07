/* «Правила» — the trader's own limits: switch, editable limit, violations over the period.
   Rows are keyed by rule id and updated in place, so a repaint never swaps out the control
   the trader is about to click (a blur-commit used to swallow the next click). */
import { RAW_DAYS, formatDate } from "../data.js";
import { el, pageHead, daysWord, plural } from "./dom.js";
import { RULE_KINDS, validateRule, violationDays } from "./rule-kinds.js";
import { getState, setRule, removeRule, subscribe } from "./store.js";
import { addRuleBlock } from "./rules-form.js";

const SWITCH = "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-3 bg-sunken transition-colors aria-checked:border-ink aria-checked:bg-ink";
const KNOB = "pointer-events-none absolute left-0.5 h-[18px] w-[18px] rounded-full shadow-sm transition-transform";

const ruleById = (id) => getState().rules.find((r) => r.id === id);

function ruleSwitch(id, labelId) {
  const knob = el("span", { class: KNOB, "aria-hidden": "true" });
  const btn = el("button", { type: "button", role: "switch", "aria-labelledby": labelId, "data-focus": `switch-${id}`, class: SWITCH }, knob);
  btn.addEventListener("click", () => {
    const rule = ruleById(id);
    if (rule) setRule(id, { enabled: !rule.enabled });
  });
  const update = (rule) => {
    btn.setAttribute("aria-checked", String(rule.enabled));
    knob.setAttribute("class", `${KNOB} ${rule.enabled ? "translate-x-5 bg-surface" : "bg-ink-3"}`);
  };
  // 44px hit area around a 24px visual switch
  return { node: el("span", { class: "grid h-11 w-14 shrink-0 place-items-center" }, btn), update };
}

/** Tiny per-day row: which trading days this rule would have flagged */
function violationDots(hitDates) {
  return el("span", { class: "flex gap-1", "aria-hidden": "true" },
    RAW_DAYS.map((d) => el("span", {
      class: `h-3 w-2 rounded-[2px] ${hitDates.has(d.date) ? "hatch" : "bg-line"}`,
      title: `${formatDate(d.date).day} ${formatDate(d.date).month}`,
    })));
}

function ruleSummary(rule, labelId) {
  const def = RULE_KINDS[rule.kind];
  const hits = violationDays(rule.kind, rule.limit);
  const count = hits.length;
  return [
    el("p", { id: labelId, class: "text-[15px] font-medium" }, def.label(rule.limit)),
    el("p", { class: "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2" },
      violationDots(new Set(hits.map((d) => d.date))),
      count ? `нарушено в ${count} ${plural(count, "день", "дня", "дней")} из ${RAW_DAYS.length}` : "ни одного нарушения за период",
      rule.enabled ? null : el("span", { class: "rounded-sm bg-sunken px-1.5 py-0.5 text-[12px]" }, "выключено")),
  ];
}

function limitField(id, kind, labelId, announce) {
  const def = RULE_KINDS[kind];
  const inputId = `limit-${id}`;
  const error = el("p", { id: `${inputId}-err`, class: "mt-1 hidden text-[12px] font-medium text-loss" });
  const input = el("input", {
    id: inputId, inputmode: "decimal", autocomplete: "off", "data-focus": inputId,
    "aria-describedby": `${labelId} ${inputId}-err`,
    class: "num h-10 w-20 rounded-sm border border-line bg-surface px-2 text-right text-[14px] aria-[invalid=true]:border-loss sm:w-24",
  });
  const commit = () => {
    const rule = ruleById(id);
    if (!rule) return;
    const result = validateRule({ kind, limit: input.value }, getState().rules.filter((r) => r.id !== id));
    error.textContent = result.errors.limit ?? "";
    error.classList.toggle("hidden", result.ok);
    input.setAttribute("aria-invalid", String(!result.ok));
    if (!result.ok || result.value.limit === rule.limit) return;
    setRule(id, { limit: result.value.limit });
    announce(`Лимит обновлён: ${def.label(result.value.limit)}.`);
  };
  input.addEventListener("change", commit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") commit(); });
  const update = (rule) => { if (document.activeElement !== input) input.value = String(rule.limit).replace(".", ","); };
  const node = el("div", { class: "sm:text-right" },
    el("label", { for: inputId, class: "flex items-center gap-2 text-[13px] text-ink-2 sm:justify-end" }, "Лимит", input, el("span", { class: "min-w-10 text-left sm:w-12" }, def.unit)),
    error);
  return { node, update };
}

function ruleRow(rule, announce) {
  const { id, kind } = rule;
  const labelId = `rule-${id}`;
  const toggle = ruleSwitch(id, labelId);
  const limit = limitField(id, kind, labelId, announce);
  const summary = el("div", { class: "min-w-0" });
  const remove = el("button", { type: "button", "data-focus": `rm-${id}`, class: "h-10 shrink-0 rounded-sm px-2 text-[13px] text-ink-2 underline-offset-4 hover:text-loss hover:underline" }, "Удалить");
  remove.addEventListener("click", () => {
    const current = ruleById(id);
    removeRule(id);
    if (current) announce(`Правило «${RULE_KINDS[kind].label(current.limit)}» удалено.`);
  });
  const node = el("li", { "data-rule": id },
    toggle.node, summary,
    // Phones: limit and delete share one row (wrapping if needed); ≥640px they become grid columns
    el("div", { class: "col-start-2 flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1 sm:contents" }, limit.node, remove));
  const update = (next) => {
    node.setAttribute("class", `grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center ${next.enabled ? "" : "text-ink-2"}`);
    toggle.update(next);
    limit.update(next);
    summary.replaceChildren(...ruleSummary(next, labelId));
    remove.setAttribute("aria-label", `Удалить правило: ${RULE_KINDS[kind].label(next.limit)}`);
  };
  update(rule);
  return { node, update, rule };
}

function emptyRules() {
  return el("li", { class: "py-10 text-center" },
    el("p", { class: "text-[17px] font-semibold" }, "Правил нет"),
    el("p", { class: "mx-auto mt-1 max-w-[42ch] text-[14px] text-ink-2" }, "Без правил кабинет покажет только деньги, но не поведение. Начните с лимита сделок в день."));
}

/** Keyed list: unchanged rules keep their nodes, changed ones update in place */
function rulesList(announce) {
  const list = el("ul", { class: "mt-4 divide-y divide-line border-y border-line", "aria-label": "Ваши правила" });
  let rows = new Map();
  const paint = (state) => {
    const hadFocus = list.contains(document.activeElement);
    const next = new Map(state.rules.map((r) => {
      const row = rows.get(r.id) ?? ruleRow(r, announce);
      if (row.rule !== r) row.update(r);
      return [r.id, { ...row, rule: r }];
    }));
    const sameOrder = next.size === rows.size && [...next.keys()].every((k, i) => [...rows.keys()][i] === k);
    rows = next;
    if (sameOrder && list.children.length === next.size && next.size) return;
    list.replaceChildren(...(next.size ? [...next.values()].map((r) => r.node) : [emptyRules()]));
    // A deleted rule takes its button with it — land on the list heading instead of <body>
    if (hadFocus && !list.contains(document.activeElement)) document.getElementById("rules-list-h")?.focus();
  };
  return { list, paint };
}

function render(root) {
  const status = el("p", { role: "status", class: "min-h-[20px] text-[13px] text-ink-2" });
  const announce = (text) => { status.textContent = text; };
  const { list, paint } = rulesList(announce);

  root.append(
    pageHead("Ваши ограничения", "Правила",
      `Правило — обещание самому себе. Счётчики посчитаны по сделкам за 24 фев — 30 мар (${daysWord(RAW_DAYS.length)}). Изменения сразу пересчитывают главную, «Мои цифры» и «Неделю».`),
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
