/* Cumulative result curve (moved unchanged in behaviour from the original app.js). */
import { DAYS, formatDate, formatMoney } from "../data.js";
import { svg } from "./dom.js";

// Width follows the container so axis text stays 11px on phones instead of scaling down.
const CURVE = Object.freeze({ H: 230, l: 72, r: 14, t: 12, b: 28, minW: 300 });

function axisText(txt, ax, ay, anchor) {
  const t = svg("text", { x: ax, y: ay, "text-anchor": anchor, class: "num", "font-size": 11, fill: "rgb(var(--c-ink-2))" });
  t.textContent = txt;
  return t;
}

function drawSeries(root, cumulative, x, y) {
  const line = cumulative.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = cumulative.length - 1;
  root.append(svg("path", { d: `${line} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`, fill: "rgb(var(--c-loss) / 0.08)" }));
  root.append(svg("path", { d: line, fill: "none", stroke: "rgb(var(--c-ink))", "stroke-width": 1.8, "stroke-linejoin": "round" }));
  cumulative.forEach((v, i) => {
    const broken = DAYS[i].broken.length > 0;
    root.append(svg("circle", {
      cx: x(i), cy: y(v), r: broken ? 5.5 : 3,
      fill: broken ? "rgb(var(--c-broken))" : "rgb(var(--c-ink))",
      stroke: "rgb(var(--c-surface))", "stroke-width": 2,
    }));
  });
}

/** Draws into `container` and redraws when its width changes. Returns a cleanup function. */
export function mountCurve(container) {
  let lastWidth = 0;
  const observer = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (!width || width === lastWidth) return;
    lastWidth = width;
    container.replaceChildren();
    renderCurve(container);
  });
  observer.observe(container);
  return () => observer.disconnect();
}

function renderCurve(container) {
  const { H, l, r, t, b, minW } = CURVE;
  const W = Math.max(minW, container.clientWidth);
  const cumulative = DAYS.reduce((acc, d) => [...acc, (acc.at(-1) ?? 0) + d.pnl], []);
  const lo = Math.min(0, ...cumulative);
  const hi = Math.max(0, ...cumulative);
  const x = (i) => l + (i / (DAYS.length - 1)) * (W - l - r);
  const y = (v) => t + ((hi - v) / (hi - lo)) * (H - t - b);

  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", class: "block h-auto overflow-visible", "aria-hidden": "true" });
  root.append(svg("line", { x1: l, x2: W - r, y1: y(0), y2: y(0), stroke: "rgb(var(--c-ink-3))", "stroke-dasharray": "3 4" }));
  drawSeries(root, cumulative, x, y);

  const first = formatDate(DAYS[0].date);
  const last = formatDate(DAYS.at(-1).date);
  root.append(axisText(formatMoney(0, { sign: false }), l - 10, y(0) + 4, "end"));
  root.append(axisText(formatMoney(lo), l - 10, y(lo) + 4, "end"));
  root.append(axisText(`${first.day} ${first.month}`, x(0), H - 6, "start"));
  root.append(axisText(`${last.day} ${last.month}`, x(DAYS.length - 1), H - 6, "end"));

  const brokenCount = DAYS.filter((d) => d.broken.length).length;
  container.setAttribute("aria-label",
    `Накопленный результат с ${first.day} ${first.month} по ${last.day} ${last.month}: ` +
    `от ${formatMoney(cumulative[0])} до ${formatMoney(cumulative.at(-1))}, минимум ${formatMoney(lo)}; ` +
    `дней с нарушениями: ${brokenCount}. Подробно — в таблице «По дням».`);
  container.append(root);
}
