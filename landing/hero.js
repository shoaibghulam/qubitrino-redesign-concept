/* Hero product fragment: «Отметки дней» strip + discipline split, all from data.js. */
import { ACCOUNT, DAYS, RULES, disciplineSplit, formatDate, formatMoney } from "../data.js";
import { el, setText, byId, daysWord, tradesWord, barHeight } from "./dom.js";

const STRIP_MAX_PX = 104;
const STRIP_MIN_PX = 10;

export function describeDay(day) {
  const { day: d, month, weekday } = formatDate(day.date);
  const rules = day.broken.length
    ? `нарушено: ${day.broken.map((id) => RULES.find((r) => r.id === id).label.toLowerCase()).join("; ")}`
    : "правила соблюдены";
  return `${d} ${month}, ${weekday}: ${tradesWord(day.trades)}, ${formatMoney(day.pnl)}; ${rules}`;
}

function stripItem(day, maxTrades) {
  const height = barHeight(day.trades, maxTrades, STRIP_MAX_PX, STRIP_MIN_PX);
  const bar = el("span", {
    class: `block w-full rounded-[3px] ${day.broken.length ? "hatch" : "bg-kept"}`,
    style: `height:${height}px`,
    "aria-hidden": "true",
  });
  const date = el("span", { class: "num mt-1.5 block text-center text-[11px] text-ink-3", "aria-hidden": "true" },
    String(formatDate(day.date).day));
  const label = el("span", { class: "sr-only" }, describeDay(day));
  return el("li", { class: "flex h-full min-w-0 flex-1 flex-col justify-end" }, bar, date, label);
}

function renderStrip() {
  const strip = byId("hero-strip");
  const maxTrades = Math.max(...DAYS.map((d) => d.trades));
  DAYS.forEach((day) => strip.append(stripItem(day, maxTrades)));
}

/** Share of the period's loss that came from days with broken rules. */
export function brokenShare({ keptPnl, brokenPnl }) {
  const total = keptPnl + brokenPnl;
  if (total >= 0 || brokenPnl >= 0) return 0;
  return Math.round((brokenPnl / total) * 100);
}

export function renderHero() {
  const split = disciplineSplit(DAYS);
  setText("hero-period", ACCOUNT.period);
  setText("hero-symbol", ACCOUNT.symbol);
  renderStrip();
  setText("hero-kept", formatMoney(split.keptPnl));
  setText("hero-broken", formatMoney(split.brokenPnl));
  setText("hero-kept-n", daysWord(split.kept.length));
  setText("hero-broken-n", daysWord(split.broken.length));
  const share = brokenShare(split);
  setText("hero-share", `${share} %`);
  byId("hero-share-bar").style.width = `${share}%`;
}
