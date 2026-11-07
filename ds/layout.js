/*
  Space, layout grid, radius and elevation. Drawn as small diagrams built
  from the same tokens, so the picture is the rule.
*/
import { el } from "./dom.js";

const SPACE = Object.freeze([
  [1, 4, "иконка ↔ текст в метке"],
  [2, 8, "внутри компонента"],
  [3, 12, "строки таблицы, поля формы"],
  [4, 16, "поля мобильного экрана"],
  [6, 24, "внутри панели"],
  [8, 32, "между блоками внутри секции"],
  [10, 40, "поля десктопа, между панелями"],
  [16, 64, "между секциями страницы"],
]);

function spaceRow([step, px, use]) {
  return el("li", { class: "grid grid-cols-[52px_44px_1fr] items-center gap-3 py-2 sm:grid-cols-[64px_56px_96px_1fr]" },
    el("code", { class: "num text-[13px] font-medium" }, `${step}`),
    el("span", { class: "num text-[13px] text-ink-2" }, `${px}px`),
    el("span", { class: "hidden h-3 sm:block", "aria-hidden": "true" },
      el("span", { class: "block h-3 rounded-[2px] bg-ink-3/70", style: `width:${px * 1.4}px` })),
    el("span", { class: "text-[13px] text-ink-2" }, use));
}

function spacing() {
  return el("div", {},
    el("div", { class: "grid grid-cols-[52px_44px_1fr] gap-3 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-2 sm:grid-cols-[64px_56px_96px_1fr]", "aria-hidden": "true" },
      el("span", {}, "Tailwind"), el("span", {}, "px"), el("span", { class: "hidden sm:block" }, "шаг"), el("span", {}, "где")),
    el("ol", { class: "divide-y divide-line border-y border-line", "aria-label": "Шкала отступов, шаг 4px" }, SPACE.map(spaceRow)));
}

/* ---------- Layout diagrams ---------- */

function label(text, cls = "") {
  return el("span", { class: `num text-[11px] text-ink-2 ${cls}` }, text);
}

function desktopDiagram() {
  const content = el("div", { class: "flex min-w-0 flex-1 flex-col gap-2 p-3" },
    el("div", { class: "flex flex-wrap items-center justify-between gap-x-2" }, label("контент ≤ 1180"), label("поля 40")),
    el("div", { class: "h-6 rounded-[3px] border border-dashed border-ink-3/70" }),
    el("div", { class: "grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,88px)] gap-2" },
      el("div", { class: "rounded-[3px] border border-dashed border-ink-3/70" }),
      el("div", { class: "rounded-[3px] border border-dashed border-ink-3/70" })));
  return el("figure", {},
    el("div", { class: "flex h-[200px] overflow-hidden rounded-md border border-line bg-paper", "aria-hidden": "true" },
      el("div", { class: "flex w-[26%] flex-col gap-1.5 border-r border-line bg-surface p-3" },
        label("сайдбар 232"),
        [70, 55, 62, 48].map((w) => el("span", { class: "block h-1.5 rounded-full bg-line", style: `width:${w}%` }))),
      content),
    el("figcaption", { class: "mt-2 text-[13px] text-ink-2" }, "≥ 1024px: сайдбар 232px + контент до 1180px, поля 40px. Справа — колонка 300px для ключевых цифр."));
}

function mobileDiagram() {
  return el("figure", {},
    el("div", { class: "mx-auto flex h-[200px] w-[118px] flex-col overflow-hidden rounded-[14px] border border-line bg-paper", "aria-hidden": "true" },
      el("div", { class: "flex flex-1 flex-col gap-1.5 px-2 pt-3" },
        label("16 · 16", "text-center"),
        el("div", { class: "h-8 rounded-[3px] border border-dashed border-ink-3/70" }),
        el("div", { class: "flex-1 rounded-[3px] border border-dashed border-ink-3/70" })),
      el("div", { class: "flex h-7 items-center justify-center border-t border-line bg-surface" }, label("таб-бар 56"))),
    el("figcaption", { class: "mt-2 text-center text-[13px] text-ink-2" }, "< 1024px: одна колонка, поля 16px, таб-бар снизу."));
}

function grid() {
  return el("div", { class: "grid items-end gap-8 sm:grid-cols-[minmax(0,1fr)_160px]" }, desktopDiagram(), mobileDiagram());
}

/* ---------- Radius + elevation ---------- */

function radiusItem(px, token, use, demoCls) {
  return el("li", { class: "flex items-center gap-4 py-3" },
    el("span", { class: `block h-12 w-16 shrink-0 border border-ink-3/70 bg-surface ${demoCls}`, "aria-hidden": "true" }),
    el("span", {},
      el("span", { class: "num block text-[13px] font-medium" }, `${px} · ${token}`),
      el("span", { class: "block text-[13px] text-ink-2" }, use)));
}

function radius() {
  return el("ul", { class: "divide-y divide-line border-y border-line" },
    radiusItem("6px", "rounded-sm", "Контролы: кнопки, поля, метки, строки.", "rounded-sm"),
    radiusItem("10px", "rounded-md", "Панели, таблицы, фрейм телефона.", "rounded-md"),
    radiusItem("50%", "rounded-full", "Только точки-маркеры и переключатель.", "rounded-full w-12"));
}

const ELEVATION = Object.freeze([
  ["0 · линия", "Разделитель вместо карточки. По умолчанию.", "border-y border-line bg-transparent"],
  ["1 · панель", "Поверхность + граница, без тени. Графики, таблицы.", "rounded-md border border-line bg-surface"],
  ["2 · над слоем", "Единственная тень: тосты и выпадающие меню.", "rounded-md border border-line bg-surface shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)]"],
]);

function elevation() {
  return el("ol", { class: "grid gap-5 sm:grid-cols-3" }, ELEVATION.map(([title, use, cls]) =>
    el("li", {},
      el("div", { class: `h-20 ${cls}`, "aria-hidden": "true" }),
      el("p", { class: "mt-3 text-[13px] font-medium" }, title),
      el("p", { class: "mt-0.5 text-[13px] leading-snug text-ink-2" }, use))));
}

export function renderLayout({ spaceEl, gridEl, radiusEl, elevationEl }) {
  spaceEl.append(spacing());
  gridEl.append(grid());
  radiusEl.append(radius());
  elevationEl.append(elevation());
}
