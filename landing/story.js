/*
  Scroll story: 13 day bars start in calendar order, then — once the section is in view —
  slide into two groups (kept / broken). Motion is transform-only; the trigger is an
  IntersectionObserver, never a scroll handler. Reduced motion → final state at once.
*/
import { DAYS, disciplineSplit, formatMoney } from "../data.js";
import { el, byId, setText, daysWord, barHeight, prefersReducedMotion } from "./dom.js";

const GAP_SLOTS = 2;            // empty slots between the two groups
const BAR_MAX_PX = 160;
const BAR_MIN_PX = 10;
const STAGGER_MS = 35;
const COUNT_MS = 1100;

/** Slot positions for both states. Calendar order is centred within the same 15 slots. */
export function slotsFor(days) {
  const keptCount = days.filter((d) => !d.broken.length).length;
  const total = days.length + GAP_SLOTS;
  const offset = Math.floor((total - days.length) / 2);
  let kept = 0;
  let broken = 0;
  return days.map((day, i) => {
    const sorted = day.broken.length ? keptCount + GAP_SLOTS + broken++ : kept++;
    return { day, calendar: i + offset, sorted };
  });
}

function buildBars(container, placements) {
  const maxTrades = Math.max(...DAYS.map((d) => d.trades));
  return placements.map(({ day, calendar, sorted }, i) => {
    const fill = el("span", {
      class: `block w-full rounded-[3px] ${day.broken.length ? "hatch" : "bg-kept"}`,
      style: `height:${barHeight(day.trades, maxTrades, BAR_MAX_PX, BAR_MIN_PX)}px`,
    });
    const bar = el("span", { class: "story-bar", style: `--slot:${calendar};transition-delay:${i * STAGGER_MS}ms` }, fill);
    bar.dataset.sorted = String(sorted);
    container.append(bar);
    return bar;
  });
}

function countTo(id, target, instant) {
  const node = byId(id);
  if (instant) { node.textContent = formatMoney(target); return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / COUNT_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    node.textContent = formatMoney(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function sortBars(story, bars, split, instant) {
  bars.forEach((bar) => {
    if (instant) bar.style.transition = "none";
    bar.style.setProperty("--slot", bar.dataset.sorted);
  });
  story.dataset.sorted = "true";
  countTo("story-kept", split.keptPnl, instant);
  countTo("story-broken", split.brokenPnl, instant);
}

function observeOnce(target, onEnter) {
  if (!("IntersectionObserver" in window)) { onEnter(true); return; }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    onEnter(false);
  }, { threshold: 0.6 });
  observer.observe(target);
}

export function renderStory() {
  const story = byId("story");
  const split = disciplineSplit(DAYS);
  const bars = buildBars(byId("story-bars"), slotsFor(DAYS));
  setText("story-kept-n", daysWord(split.kept.length));
  setText("story-broken-n", daysWord(split.broken.length));
  setText("story-kept", formatMoney(0));
  setText("story-broken", formatMoney(0));
  setText("story-summary",
    `${daysWord(split.kept.length)} по правилам: ${formatMoney(split.keptPnl)}. ` +
    `${daysWord(split.broken.length)} с нарушениями: ${formatMoney(split.brokenPnl)}.`);

  if (prefersReducedMotion()) { sortBars(story, bars, split, true); return; }
  observeOnce(byId("story-bars"), (instant) => sortBars(story, bars, split, instant));
}
