/* Rule kinds the trader can configure. Each kind knows how to check one trading day
   against the real trades from the MT5 report (grouped by close date, like DAYS). */
import { DAYS } from "../data.js";
import { TRADES } from "../trades.js";

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

export const RULE_KINDS = Object.freeze({
  "max-trades": Object.freeze({
    name: "Сделок в день", unit: "сделок", min: 1, max: 100, step: 1,
    label: (n) => `Не больше ${n} сделок в день`,
    violated: (day, n) => day.trades > n,
  }),
  "max-loss": Object.freeze({
    name: "Дневной убыток", unit: "₽", min: 100, max: 1000000, step: 100,
    label: (n) => `Дневной убыток не больше ${rub(n)} ₽`,
    violated: (day, n) => day.pnl < -n,
  }),
  "max-volume": Object.freeze({
    name: "Объём позиции", unit: "лота", min: 0.01, max: 10, step: 0.01,
    label: (n) => `Объём позиции не больше ${lots(n)} лота`,
    violated: (day, n) => tradesOf(day.date).some((t) => t.volume > n + 1e-9),
  }),
  "max-streak": Object.freeze({
    name: "Убыточных подряд", unit: "сделок", min: 1, max: 50, step: 1,
    label: (n) => `Не больше ${n} убыточных сделок подряд`,
    violated: (day, n) => longestLossStreak(tradesOf(day.date)) > n,
  }),
});

/** Days of the period on which a rule of `kind` with `limit` would have been broken */
export function violationDays(kind, limit) {
  const def = RULE_KINDS[kind];
  return def ? DAYS.filter((day) => def.violated(day, limit)) : [];
}

/**
 * Validate the add-rule form. Returns { ok, errors: { field: message }, value }.
 * @param {{ kind: string, limit: string }} input
 */
export function validateRule(input, existing) {
  const errors = {};
  const def = RULE_KINDS[input.kind];
  if (!def) errors.kind = "Выберите, что ограничивает правило.";
  const raw = String(input.limit ?? "").trim().replace(",", ".").replace(/\s/g, "");
  const limit = Number(raw);
  if (!raw) errors.limit = "Укажите лимит.";
  else if (!Number.isFinite(limit)) errors.limit = "Лимит должен быть числом.";
  else if (def && (limit < def.min || limit > def.max)) {
    errors.limit = `Допустимо от ${def.min.toLocaleString("ru-RU")} до ${def.max.toLocaleString("ru-RU")} ${def.unit}.`;
  } else if (def && def.step >= 1 && !Number.isInteger(limit)) errors.limit = "Нужно целое число.";
  if (def && !errors.limit && existing.some((r) => r.kind === input.kind && r.limit === limit)) {
    errors.limit = "Такое правило уже есть.";
  }
  return { ok: Object.keys(errors).length === 0, errors, value: { kind: input.kind, limit } };
}
