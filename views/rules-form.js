/* Add-rule disclosure + form with inline validation and a live "what if" preview. */
import { RAW_DAYS } from "../data.js";
import { el, icon, plural, BTN_PRIMARY, BTN_QUIET } from "./dom.js";
import { RULE_KINDS, validateRule, violationDays } from "./rule-kinds.js";
import { getState, addRule } from "./store.js";

const ANNOUNCE_DELAY_MS = 500;
const PREVIEW_IDLE = "Выберите тип и лимит — покажем, как правило сработало бы на ваших сделках.";
const INPUT = "h-10 w-full rounded-sm border border-line bg-surface px-3 text-[14px] aria-[invalid=true]:border-loss";

function field(id, label, control, hint) {
  const error = el("p", { id: `${id}-error`, class: "mt-1.5 hidden text-[13px] font-medium text-loss" });
  const hintNode = hint ? el("p", { id: `${id}-hint`, class: "mt-1.5 text-[12px] text-ink-2" }, hint) : null;
  control.setAttribute("aria-describedby", [hint ? `${id}-hint` : "", `${id}-error`].join(" ").trim());
  return { node: el("div", {}, el("label", { for: id, class: "mb-1.5 block text-[13px] font-medium" }, label), control, hintNode, error), error, control };
}

function setError(f, message) {
  f.error.textContent = message ?? "";
  f.error.classList.toggle("hidden", !message);
  f.control.setAttribute("aria-invalid", String(Boolean(message)));
}

function kindSelect() {
  return el("select", { id: "nr-kind", name: "kind", class: INPUT },
    el("option", { value: "" }, "Выберите…"),
    Object.entries(RULE_KINDS).map(([key, def]) => el("option", { value: key }, def.name)));
}

/** Preview uses the same validation as submit — no «what if» for input that would be rejected */
function previewText(kind, limitRaw) {
  const result = validateRule({ kind, limit: limitRaw }, []);
  if (!result.ok) return PREVIEW_IDLE;
  const { limit } = result.value;
  const total = RAW_DAYS.length;
  const hits = violationDays(kind, limit).length;
  return `«${RULE_KINDS[kind].label(limit)}»: за период было бы нарушено в ${hits} из ${total} ${plural(total, "торгового дня", "торговых дней", "торговых дней")}.`;
}

function buildForm(onDone) {
  const kind = field("nr-kind", "Что ограничиваем", kindSelect());
  const limit = field("nr-limit", "Лимит", el("input", { id: "nr-limit", name: "limit", inputmode: "decimal", autocomplete: "off", class: `${INPUT} num` }), "Например: 10 сделок, 2 000 ₽, 0,2 лота");
  const preview = el("p", { class: "text-[13px] text-ink-2" }, PREVIEW_IDLE);
  // Screen readers hear the preview after a pause or on blur, not on every keystroke
  const spoken = el("p", { class: "sr-only", "aria-live": "polite" });
  const cancel = el("button", { type: "button", class: BTN_QUIET }, "Отмена");
  const form = el("form", { novalidate: true, "aria-labelledby": "nr-h", class: "mt-4 grid gap-4 rounded-md border border-line bg-surface p-5 sm:grid-cols-2" },
    el("h3", { id: "nr-h", class: "text-[15px] font-semibold sm:col-span-2" }, "Новое правило"),
    kind.node, limit.node,
    el("div", { class: "sm:col-span-2 rounded-sm bg-sunken px-4 py-3" }, preview, spoken),
    el("div", { class: "flex gap-2 sm:col-span-2" }, el("button", { type: "submit", class: BTN_PRIMARY }, "Добавить правило"), cancel));

  let timer = null;
  const speak = () => { clearTimeout(timer); if (preview.textContent !== PREVIEW_IDLE) spoken.textContent = preview.textContent; };
  const refresh = () => {
    preview.textContent = previewText(kind.control.value, limit.control.value);
    clearTimeout(timer);
    timer = setTimeout(speak, ANNOUNCE_DELAY_MS);
  };
  kind.control.addEventListener("change", () => { setError(kind, null); refresh(); });
  limit.control.addEventListener("input", () => { setError(limit, null); refresh(); });
  limit.control.addEventListener("blur", speak);
  cancel.addEventListener("click", () => onDone(null));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateRule({ kind: kind.control.value, limit: limit.control.value }, getState().rules);
    setError(kind, result.errors.kind);
    setError(limit, result.errors.limit);
    if (!result.ok) return (result.errors.kind ? kind : limit).control.focus();
    clearTimeout(timer);
    const id = addRule(result.value);
    onDone({ ...result.value, id });
  });
  return form;
}

/** Disclosure button + form slot. announce(text) reports the outcome to a live region. */
export function addRuleBlock(announce) {
  const slot = el("div");
  const toggle = el("button", { type: "button", class: BTN_QUIET, "aria-expanded": "false", "aria-controls": "nr-slot" }, icon("plus", 18), "Добавить правило");
  slot.id = "nr-slot";
  const close = (added) => {
    slot.replaceChildren();
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("hidden");
    if (!added) return toggle.focus();
    announce(`Правило «${RULE_KINDS[added.kind].label(added.limit)}» добавлено и включено.`);
    // Land on the new rule's switch — the trader can turn it off right away
    (document.querySelector(`[data-focus="switch-${added.id}"]`) ?? toggle).focus();
  };
  toggle.addEventListener("click", () => {
    slot.replaceChildren(buildForm(close));
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("hidden");
    slot.querySelector("select").focus();
  });
  return el("div", { class: "mt-6" }, toggle, slot);
}
