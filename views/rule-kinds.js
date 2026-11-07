/* Rule kinds the trader can configure. Each kind knows how to check one trading day
   against the real trades from the MT5 report (grouped by close date, like DAYS). */
import { RAW_DAYS } from "../data.js";
import { TRADES } from "../trades.js";
import { getState } from "./store.js";

const TRADES_BY_DAY = Object.freeze(TRADES.reduce((acc, t) => {
  const date = t.close.slice(0, 10);
  return { ...acc, [date]: [...(acc[date] ?? []), t] };
}, {}));

const tradesOf = (date) => TRADES_BY_DAY[date] ?? [];

function longestLossStreak(trades) {
  return trades.reduce((acc, t) => {
    const run = t.profit < 0 ? acc.run + 1 : 0;
    return { run, max: Math.max(acc.max, run) };
  }, { run: 0, max: 0 }).max;
}

const lots = (v) => v.toLocaleString("ru-RU", { minimumFractionDigits: 2 });
const rub = (v) => v.toLocaleString("ru-RU");
const NBSP = " ";

export const RULE_KINDS = Object.freeze({
  "max-trades": Object.freeze({
    name: "Сделок в день", unit: "сделок", min: 1, max: 100, step: 1,
    label: (n) => `Не больше ${n} сделок в день`,
    short: (n) => `> ${n} сделок`,
    violated: (day, n) => day.trades > n,
  }),
  "max-loss": Object.freeze({
    name: "Дневной убыток", unit: "₽", min: 100, max: 1000000, step: 100,
    label: (n) => `Дневной убыток не больше ${rub(n)}${NBSP}₽`,
    short: (n) => `убыток > ${rub(n)}${NBSP}₽`,
    violated: (day, n) => day.pnl < -n,
  }),
  "max-volume": Object.freeze({
    name: "Объём позиции", unit: "лота", min: 0.01, max: 10, step: 0.01,
    label: (n) => `Объём позиции не больше ${lots(n)} лота`,
    short: (n) => `объём > ${lots(n)}`,
    violated: (day, n) => tradesOf(day.date).some((t) => t.volume > n + 1e-9),
  }),
  "max-streak": Object.freeze({
    name: "Убыточных подряд", unit: "сделок", min: 1, max: 50, step: 1,
    label: (n) => `Не больше ${n} убыточных сделок подряд`,
    short: (n) => `> ${n} убыточных подряд`,
    violated: (day, n) => longestLossStreak(tradesOf(day.date)) > n,
  }),
});

/**
 * Pure: checks every day against the enabled rules.
 * Each day gets broken (rule ids) and brokenRules ({ id, label, short }) in rule order.
 */
export function evaluateDays(days, rules) {
  const active = rules.filter((r) => r.enabled && RULE_KINDS[r.kind]);
  return Object.freeze(days.map((day) => {
    const hit = active.filter((r) => RULE_KINDS[r.kind].violated(day, r.limit));
    const brokenRules = Object.freeze(hit.map((r) => Object.freeze({
      id: r.id, label: RULE_KINDS[r.kind].label(r.limit), short: RULE_KINDS[r.kind].short(r.limit),
    })));
    return Object.freeze({ ...day, broken: Object.freeze(hit.map((r) => r.id)), brokenRules });
  }));
}

/** Trading days evaluated against the rules currently in the store */
export const currentDays = () => evaluateDays(RAW_DAYS, getState().rules);

/** Days of the period on which a rule of `kind` with `limit` would have been broken */
export function violationDays(kind, limit) {
  const def = RULE_KINDS[kind];
  return def ? RAW_DAYS.filter((day) => def.violated(day, limit)) : [];
}

const NUMBER_RE = /^\d+([.,]\d+)?$/;
const onStep = (value, step) => Math.abs(value / step - Math.round(value / step)) < 1e-9;
const stepError = (def) => (def.step === 1 ? "Нужно целое число." : `Лимит должен быть кратен ${def.step.toLocaleString("ru-RU")}${NBSP}${def.unit}.`);

function limitError(def, raw) {
  if (!raw) return "Укажите лимит.";
  if (!NUMBER_RE.test(raw)) return "Лимит должен быть числом, например 10 или 0,2.";
  if (!def) return null;
  const limit = Number(raw.replace(",", "."));
  if (limit < def.min || limit > def.max) {
    return `Допустимо от ${def.min.toLocaleString("ru-RU")} до ${def.max.toLocaleString("ru-RU")}${NBSP}${def.unit}.`;
  }
  return onStep(limit, def.step) ? null : stepError(def);
}

/**
 * Validate a rule (add form, inline limit edit, preview). Returns { ok, errors: { field: message }, value }.
 * Spaces (incl. no-break) are ignored so «2 000» is accepted; decimal comma or point.
 * @param {{ kind: string, limit: string }} input
 */
export function validateRule(input, existing) {
  const errors = {};
  const def = RULE_KINDS[input.kind];
  if (!def) errors.kind = "Выберите, что ограничивает правило.";
  const raw = String(input.limit ?? "").replace(/[\s  ]/g, "");
  const limitMessage = limitError(def, raw);
  if (limitMessage) errors.limit = limitMessage;
  const limit = limitMessage ? NaN : Number(raw.replace(",", "."));
  if (def && !errors.limit && existing.some((r) => r.kind === input.kind && r.limit === limit)) {
    errors.limit = "Такое правило уже есть.";
  }
  return { ok: Object.keys(errors).length === 0, errors, value: { kind: input.kind, limit } };
}
