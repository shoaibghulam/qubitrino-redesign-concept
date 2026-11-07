/*
  Colour section: every token, both themes side by side, each with the measured
  contrast of the pairing it is actually used in. Values come from tokens.css.
*/
import { el } from "./dom.js";
import { blend, contrast, formatRatio, grade, toCss, toHex } from "./tokens.js";

const SAMPLE_TEXT = "Аа −24 594 ₽";
const FIELD_BORDER_ALPHA = 0.8;

/* kind: text (4.5 / 3 large) · nontext (3:1, WCAG 1.4.11) · decor (no requirement) */
const GROUPS = Object.freeze([
  ["Поверхности", [
    { token: "paper", role: "Фон страницы. Тёплый, не клинически белый.", fg: "ink", bg: "paper", kind: "text" },
    { token: "surface", role: "Панели, таблицы, поля ввода.", fg: "ink", bg: "surface", kind: "text" },
    { token: "sunken", role: "Утопленные зоны: выбранная строка, код, скелетон. Худший случай — подпись ink-3.", fg: "ink-3", bg: "sunken", kind: "text" },
    { token: "line", role: "Волосяные разделители. Декор: границу контрола рисует ink-3.", fg: "line", bg: "surface", kind: "decor" },
  ]],
  ["Текст", [
    { token: "ink", role: "Основной текст и числа.", fg: "ink", bg: "paper", kind: "text" },
    { token: "ink-2", role: "Вторичный текст, подписи столбцов.", fg: "ink-2", bg: "paper", kind: "text" },
    { token: "ink-3", role: "Подписи, плейсхолдеры, границы полей.", fg: "ink-3", bg: "paper", kind: "text" },
  ]],
  ["Действие — только интерактив", [
    { token: "action", role: "Ссылки, основная кнопка, фокус. Никогда — данные.", fg: "action", bg: "surface", kind: "text" },
    { token: "on-action", role: "Текст на основной кнопке.", fg: "on-action", bg: "action", kind: "text" },
  ]],
  ["Деньги — результат сделки", [
    { token: "gain", role: "Прибыль. Всегда со знаком «+».", fg: "gain", bg: "surface", kind: "text" },
    { token: "loss", role: "Убыток. Знак «−» дублирует цвет. Также — ошибки форм.", fg: "loss", bg: "surface", kind: "text" },
  ]],
  ["Поведение — результат дисциплины", [
    { token: "kept", role: "Правило соблюдено: сплошная заливка цветом текста.", fg: "kept", bg: "surface", kind: "nontext" },
    { token: "broken", role: "Правило нарушено: янтарь + диагональная штриховка. Не текст.", fg: "broken", bg: "surface", kind: "nontext", hatch: true },
  ]],
  ["ИИ — только ИИ-функции", [
    { token: "ai", role: "Метка и кромка ИИ-разборов. Больше нигде.", fg: "ai", bg: "surface", kind: "text" },
  ]],
]);

function hatchStyle(theme) {
  const s = theme.surface.join(" ");
  return `background-color:${toCss(theme.broken)};background-image:repeating-linear-gradient(-45deg,transparent 0 3px,rgb(${s} / 0.6) 3px 5px)`;
}

function preview(spec, theme) {
  const bg = toCss(theme[spec.bg]);
  const box = "flex h-16 items-center gap-1.5 rounded-sm px-3 sm:px-4";
  const edge = `;box-shadow:inset 0 0 0 1px ${toCss(theme.line)}`;
  if (spec.kind === "text") {
    return el("div", { class: `${box} text-[15px] font-medium sm:text-[17px]`, style: `background:${bg};color:${toCss(theme[spec.fg])}${edge}`, "aria-hidden": "true" },
      el("span", { class: "num" }, SAMPLE_TEXT));
  }
  if (spec.kind === "decor") {
    return el("div", { class: `${box} flex-col items-stretch justify-center`, style: `background:${bg}${edge}`, "aria-hidden": "true" },
      el("span", { class: "block h-px", style: `background:${toCss(theme.line)}` }),
      el("span", { class: "mt-3 block h-px", style: `background:${toCss(theme.line)}` }));
  }
  const fill = spec.hatch ? hatchStyle(theme) : `background:${toCss(theme[spec.fg])}`;
  const bars = [28, 40, 18, 34].map((h) => el("span", { class: "block w-3 rounded-[3px]", style: `height:${h}px;${fill}` }));
  return el("div", { class: `${box} items-end pb-3`, style: `background:${bg}${edge}`, "aria-hidden": "true" }, bars);
}

function gradeBadge(result) {
  const tone = result.pass === false
    ? "border-loss/60 text-loss"
    : result.pass === null ? "border-line text-ink-2" : "border-ink-3/50 text-ink";
  return el("span", { class: `inline-flex h-6 items-center rounded-sm border px-1.5 text-[11px] font-medium ${tone}` }, result.label);
}

function themeCell(spec, theme, themeName) {
  const value = theme[spec.token];
  const ratio = contrast(theme[spec.fg], theme[spec.bg]);
  const pairing = spec.fg === spec.bg ? spec.fg : `${spec.fg} на ${spec.bg}`;
  return el("td", { role: "cell", class: "block min-w-0 pb-4 align-top sm:table-cell sm:px-4 sm:py-4" },
    el("p", { class: "mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-2 sm:hidden", "aria-hidden": "true" }, themeName),
    preview(spec, theme),
    el("p", { class: "num mt-2.5 text-[12px] text-ink-2" }, `${toHex(value)} · ${value.join(" ")}`),
    el("p", { class: "mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]" },
      el("span", { class: "text-ink-2" }, pairing),
      el("span", { class: "num font-medium" }, formatRatio(ratio)),
      gradeBadge(grade(ratio, spec.kind)),
      el("span", { class: "sr-only" }, `(${themeName} тема)`)));
}

function tokenRow(spec, tokens) {
  return el("tr", { role: "row", class: "grid grid-cols-2 gap-x-3 border-t border-line sm:table-row" },
    el("th", { scope: "row", role: "rowheader", class: "col-span-2 block pb-3 pt-4 text-left align-top font-normal sm:table-cell sm:px-4 sm:py-4" },
      el("code", { class: "num text-[13px] font-medium text-ink" }, `--c-${spec.token}`),
      el("p", { class: "num mt-0.5 text-[12px] text-ink-2" }, `${spec.kind === "decor" ? "border" : "text/bg"}-${spec.token}`),
      el("p", { class: "mt-2 max-w-[30ch] text-[13px] leading-snug text-ink-2" }, spec.role)),
    themeCell(spec, tokens.light, "светлая"),
    themeCell(spec, tokens.dark, "тёмная"));
}

function groupRows(title, specs, tokens) {
  const head = el("tr", { class: "block sm:table-row" },
    el("th", { scope: "rowgroup", colspan: "3", class: "block pb-2 pt-8 sm:table-cell text-left text-[11px] font-medium uppercase tracking-[0.08em] text-ink-2 sm:px-4" }, title));
  return el("tbody", { role: "rowgroup", class: "block sm:table-row-group" }, head, specs.map((s) => tokenRow(s, tokens)));
}

/** Derived pairs that are not a single token but matter for compliance */
function derivedRows(tokens) {
  const rows = [
    ["Граница поля: ink-3 · 80 % на surface", (t) => contrast(blend(t["ink-3"], t.surface, FIELD_BORDER_ALPHA), t.surface), "nontext"],
    ["Подпись ink-3 на sunken (код, выбранная строка)", (t) => contrast(t["ink-3"], t.sunken), "text"],
    ["Кольцо фокуса action на paper", (t) => contrast(t.action, t.paper), "nontext"],
  ];
  return rows.map(([label, measure, kind]) => {
    const cell = (theme) => {
      const r = measure(theme);
      return el("td", { role: "cell", class: "block pb-3 sm:table-cell sm:px-4 sm:py-3" },
        el("span", { class: "flex flex-wrap items-center gap-2 text-[12px]" },
          el("span", { class: "text-ink-2 sm:hidden", "aria-hidden": "true" }, theme === tokens.light ? "светлая" : "тёмная"),
          el("span", { class: "num font-medium" }, formatRatio(r)), gradeBadge(grade(r, kind))));
    };
    return el("tr", { role: "row", class: "grid grid-cols-2 gap-x-3 border-t border-line sm:table-row" },
      el("th", { scope: "row", role: "rowheader", class: "col-span-2 block pb-2 pt-3 text-left text-[13px] font-normal text-ink-2 sm:table-cell sm:px-4 sm:py-3" }, label),
      cell(tokens.light), cell(tokens.dark));
  });
}

/** Collects every failing pairing so the summary line can name them honestly */
export function failingPairs(tokens) {
  const fails = [];
  GROUPS.forEach(([, specs]) => specs.forEach((spec) => {
    ["light", "dark"].forEach((name) => {
      const t = tokens[name];
      const r = contrast(t[spec.fg], t[spec.bg]);
      const { pass } = grade(r, spec.kind);
      if (pass === false || pass === "large") fails.push({ pair: `${spec.fg} на ${spec.bg}`, theme: name, ratio: r });
    });
  }));
  return fails;
}

function summaryLine(tokens) {
  const fails = failingPairs(tokens);
  if (!fails.length) return el("p", { class: "text-[14px] text-ink-2" }, "Все основные пары проходят свой порог в обеих темах.");
  const items = fails.map((f) => `${f.pair} (${f.theme === "dark" ? "тёмная" : "светлая"}) — ${formatRatio(f.ratio)}`);
  return el("p", { class: "border-l-2 border-loss pl-3 text-[14px] leading-relaxed" },
    el("span", { class: "font-medium" }, "Ниже AA для обычного текста: "), items.join("; "),
    ". Правило: на sunken подписи набираем ink-2, не ink-3.");
}

export function renderColor(container, tokens) {
  const table = el("table", { role: "table", class: "block w-full border-collapse text-left sm:table sm:min-w-[640px]" },
    el("caption", { class: "sr-only" }, "Цветовые токены: роль, значения в светлой и тёмной темах, измеренный контраст основной пары"),
    el("thead", { class: "hidden sm:table-header-group" },
      el("tr", { class: "text-[11px] uppercase tracking-[0.08em] text-ink-2" },
        el("th", { scope: "col", class: "w-[34%] px-3 pb-1 font-medium sm:px-4" }, "Токен и роль"),
        el("th", { scope: "col", class: "px-3 pb-1 font-medium sm:px-4" }, "Светлая"),
        el("th", { scope: "col", class: "px-3 pb-1 font-medium sm:px-4" }, "Тёмная"))),
    GROUPS.map(([title, specs]) => groupRows(title, specs, tokens)),
    groupRows("Производные пары", [], tokens),
    el("tbody", { role: "rowgroup", class: "block sm:table-row-group" }, derivedRows(tokens)));

  container.append(
    summaryLine(tokens),
    el("div", { class: "mt-6 sm:overflow-x-auto" }, table));
}
