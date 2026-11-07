/* «Отметки дней» — the signature component: one bar per trading day,
   height = √(trades / max), fill = kept (solid ink) or broken (amber + hatch). */
import { RULES, formatDate, formatMoney } from "../data.js";
import { el, tradesWord } from "./dom.js";

const SIZES = Object.freeze({
  full: { max: 118, min: 14, box: "h-[158px]", col: "min-w-[40px]" },
  mini: { max: 56, min: 8, box: "h-[88px]", col: "min-w-[22px]" },
});

export function describeDay(day) {
  const { day: d, month, weekday } = formatDate(day.date);
  const rules = day.broken.length
    ? `нарушено: ${day.broken.map((id) => RULES.find((r) => r.id === id).label.toLowerCase()).join("; ")}`
    : "все правила соблюдены";
  return `${d} ${month}, ${weekday} — ${tradesWord(day.trades)}, ${formatMoney(day.pnl)}; ${rules}`;
}

function bar(day, maxTrades, size) {
  // sqrt scale: one 43-trade day must not flatten every normal day into a sliver
  const height = Math.max(size.min, Math.round(Math.sqrt(day.trades / maxTrades) * size.max));
  return el("span", {
    class: `block w-full rounded-[4px] ${day.broken.length ? "hatch" : "bg-kept"}`,
    style: `height:${height}px`,
    "aria-hidden": "true",
  });
}

const dayLabel = (day, extra = "") =>
  el("span", { class: `num mt-1.5 block text-center text-[12px] text-ink-2 ${extra}`, "aria-hidden": "true" }, String(formatDate(day.date).day));

/**
 * Interactive strip (buttons with aria-pressed). onSelect(date) is called on click.
 * @returns {{ node: HTMLOListElement, select: (date: string) => void }}
 */
export function dayStrip(days, { label, onSelect, size = "full" } = {}) {
  const s = SIZES[size];
  const maxTrades = Math.max(...days.map((d) => d.trades));
  const list = el("ol", { class: `flex ${s.box} items-end gap-1.5 overflow-x-auto px-1 pb-1 pt-1`, "aria-label": label });
  const buttons = days.map((day) => {
    const btn = el("button", {
      type: "button", "data-date": day.date, "aria-pressed": "false", "aria-label": describeDay(day),
      class: "flex h-full w-full flex-col justify-end rounded-sm px-1 pt-1 transition-transform duration-200 hover:-translate-y-0.5 aria-pressed:bg-sunken aria-pressed:ring-2 aria-pressed:ring-action",
    }, bar(day, maxTrades, s), dayLabel(day));
    btn.addEventListener("click", () => onSelect?.(day.date));
    list.append(el("li", { class: `h-full ${s.col} flex-1` }, btn));
    return btn;
  });
  const select = (date) => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.date === date)));
  return { node: list, select };
}

/** Static strip (presentational, e.g. inside a link). Text alternative is supplied by the caller. */
export function staticStrip(days, { size = "mini", highlight } = {}) {
  const s = SIZES[size];
  const maxTrades = Math.max(...days.map((d) => d.trades));
  return el("div", { class: `flex ${s.box} items-end gap-1`, "aria-hidden": "true" },
    days.map((day) => el("div", { class: `flex h-full ${s.col} flex-1 flex-col justify-end` },
      bar(day, maxTrades, s),
      dayLabel(day, day.date === highlight ? "font-semibold text-ink underline decoration-action decoration-2 underline-offset-4" : ""))));
}
