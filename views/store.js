/* In-memory client state for the concept. Every update returns a new frozen object. */

const INITIAL = Object.freeze({
  rules: Object.freeze([
    Object.freeze({ id: "max-trades", kind: "max-trades", limit: 10, enabled: true }),
    Object.freeze({ id: "max-loss", kind: "max-loss", limit: 2000, enabled: true }),
    // Illustrative extra rule, off by default — counts are still computed from the real trades
    Object.freeze({ id: "r-volume", kind: "max-volume", limit: 0.2, enabled: false }),
  ]),
  todayMark: null, // { plan, mood, note } once «Отметка дня» is submitted
  reports: Object.freeze([]),
});

let state = INITIAL;
const listeners = new Set();

export const getState = () => state;

/** update((s) => ({ ...s, x })) — the callback must return a new object */
export function update(fn) {
  state = Object.freeze(fn(state));
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const setRule = (id, patch) => update((s) => ({
  ...s,
  rules: Object.freeze(s.rules.map((r) => (r.id === id ? Object.freeze({ ...r, ...patch }) : r))),
}));

export const addRule = (rule) => update((s) => ({
  ...s,
  rules: Object.freeze([...s.rules, Object.freeze({ ...rule, id: `r-${Date.now()}`, enabled: true })]),
}));

export const removeRule = (id) => update((s) => ({ ...s, rules: Object.freeze(s.rules.filter((r) => r.id !== id)) }));

export const saveMark = (mark) => update((s) => ({ ...s, todayMark: Object.freeze({ ...mark }) }));

export const addReport = (report) => update((s) => ({ ...s, reports: Object.freeze([Object.freeze(report), ...s.reports]) }));
