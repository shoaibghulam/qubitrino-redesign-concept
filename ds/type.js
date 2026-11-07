/*
  Typography: the scale with real product copy and the number-formatting rules,
  computed live from data.js so the table cannot disagree with the product.
*/
import { el } from "./dom.js";
import { brokenShare } from "../landing/hero.js";
import { daysWord } from "../landing/dom.js";
import { DAYS, SUMMARY, disciplineSplit, formatDate, formatMoney } from "../data.js";

const NBSP = " ";
const MINUS = "−";

function scaleSpecs() {
  const split = disciplineSplit(DAYS);
  const { brokenPnl, broken } = split;
  const share = brokenShare(split);
  const shareText = share === null ? "—" : `${share}${NBSP}%`;
  return [
    { px: 44, lh: "1", weight: 500, cls: "num tracking-tight", role: "Число-герой", use: "итог периода, одна цифра на экран",
      text: formatMoney(SUMMARY.netProfit, { decimals: 2 }) },
    { px: 28, lh: "1.2", weight: 600, cls: "tracking-tight", role: "Вывод", use: "главная мысль экрана, ≤ 2 строк",
      text: `${shareText} убытка — ${daysWord(broken.length)} с нарушениями: ${formatMoney(brokenPnl)}` },
    { px: 22, lh: "1.25", weight: 600, cls: "tracking-tight", role: "Подзаголовок", use: "вывод на мобильном, заголовок модала",
      text: "2 марта: 43 сделки при лимите 10" },
    { px: 17, lh: "1.35", weight: 600, cls: "", role: "Заголовок секции", use: "h2 внутри кабинета",
      text: "Отметки дней" },
    { px: 14, lh: "1.5", weight: 400, cls: "", role: "Текст и интерфейс", use: "по умолчанию для всего",
      text: "Высота столбика — число сделок за день, штриховка — нарушенное правило. Нажмите на день, чтобы увидеть подробности." },
    { px: 12, lh: "1.4", weight: 500, cls: "uppercase tracking-[0.08em] text-ink-2", role: "Микро-метка", use: "над группой, шапка таблицы; 0,08em",
      text: "Правила и результат" },
    { px: 12, lh: "1.4", weight: 400, cls: "text-ink-2", role: "Подпись", use: "мета-данные, единицы, источники",
      text: "MT5 · счёт 5000000001 · 3 инструмента · 24.02 — 30.03.2026" },
  ];
}

function scaleRow(spec) {
  const sample = el("p", {
    class: `${spec.cls} min-w-0 break-words`,
    style: `font-size:${spec.px}px;line-height:${spec.lh};font-weight:${spec.weight}`,
  }, spec.text);
  return el("li", { class: "grid gap-3 border-t border-line py-5 sm:grid-cols-[168px_1fr] sm:gap-8" },
    el("div", {},
      el("p", { class: "num text-[13px] font-medium" }, `${spec.px} / ${spec.lh} · ${spec.weight}`),
      el("p", { class: "mt-1 text-[13px] text-ink-2" }, spec.role),
      el("p", { class: "mt-0.5 text-[12px] text-ink-2" }, spec.use)),
    sample);
}

/* ---------- Number rules ---------- */

function numberRules() {
  const d = formatDate("2026-03-02");
  const dayPnl = DAYS.find((x) => x.date === "2026-03-12")?.pnl ?? 0;
  return [
    ["formatMoney(-48854.86, { decimals: 2 })", formatMoney(SUMMARY.netProfit, { decimals: 2 }), "Итог периода — с копейками. Минус — U+2212, не дефис."],
    [`formatMoney(${dayPnl})`, formatMoney(dayPnl), "Результат дня — целые рубли, плюс пишем явно."],
    ["formatMoney(-750.54)", formatMoney(SUMMARY.avgLoss), "Средние округляем до рубля: копейки в среднем — шум."],
    ["formatMoney(0, { sign: false })", formatMoney(0, { sign: false }), "Ноль — без знака: он не прибыль и не убыток."],
    ["winRate.toLocaleString(\"ru-RU\") + \"\u00A0%\"", `${SUMMARY.winRate.toLocaleString("ru-RU")}${NBSP}%`, "Десятичная запятая; неразрывный пробел перед %."],
    ["profitFactor.toLocaleString(\"ru-RU\")", SUMMARY.profitFactor.toLocaleString("ru-RU"), "Коэффициенты — без единиц, два знака."],
    ["formatDate(\"2026-03-02\")", `${d.day}${NBSP}${d.month}, ${d.weekday}`, "Дата в тексте — «2 мар», в таблицах периода — 24.02 — 30.03.2026."],
  ];
}

/** Shows invisible characters: NBSP as a tinted dot, true minus underlined */
function revealed(text) {
  const out = el("span", { class: "num" });
  [...text].forEach((ch) => {
    if (ch === NBSP) out.append(el("span", { class: "mx-px inline-block rounded-[2px] bg-action/15 px-[3px] text-action", title: "неразрывный пробел U+00A0" }, "·"));
    else if (ch === MINUS) out.append(el("span", { class: "underline decoration-action decoration-2 underline-offset-4", title: "минус U+2212" }, ch));
    else out.append(ch);
  });
  return out;
}

function rulesTable() {
  const rows = numberRules().map(([call, result, rule]) => el("tr", { class: "border-t border-line align-top" },
    el("td", { class: "whitespace-nowrap px-3 py-3 sm:px-4" }, el("code", { class: "num text-[12px] text-ink-2" }, call)),
    el("td", { class: "whitespace-nowrap px-3 py-3 text-right text-[15px] font-medium sm:px-4" }, el("span", { class: "num" }, result)),
    el("td", { class: "whitespace-nowrap px-3 py-3 text-right text-[15px] sm:px-4", "aria-hidden": "true" }, revealed(result)),
    el("td", { class: "px-3 py-3 text-[13px] leading-snug text-ink-2 sm:px-4" }, rule)));
  return el("div", { class: "relative mt-5 overflow-x-auto rounded-md border border-line bg-surface", role: "region", tabindex: "0", "aria-label": "Правила форматирования чисел" },
    el("table", { class: "w-full min-w-[860px] text-left" },
      el("caption", { class: "sr-only" }, "Примеры formatMoney и formatDate из data.js с результатом и правилом"),
      el("thead", { class: "text-[11px] uppercase tracking-[0.08em] text-ink-2" },
        el("tr", {},
          el("th", { scope: "col", class: "px-3 py-3 font-medium sm:px-4" }, "Вызов"),
          el("th", { scope: "col", class: "px-3 py-3 text-right font-medium sm:px-4" }, "Результат"),
          el("th", { scope: "col", class: "px-3 py-3 text-right font-medium sm:px-4" }, "Символы"),
          el("th", { scope: "col", class: "px-3 py-3 font-medium sm:px-4" }, "Правило"))),
      el("tbody", {}, rows)));
}

function specimen(family, cls, glyphs, note) {
  return el("div", { class: "border-t border-line pt-5" },
    el("p", { class: "flex items-baseline justify-between gap-4" },
      el("span", { class: "text-[13px] font-medium" }, family),
      el("span", { class: "text-[12px] text-ink-2" }, note)),
    el("p", { class: `${cls} mt-3 text-[34px] leading-[1.1] tracking-tight sm:text-[40px]`, "aria-hidden": "true" }, glyphs));
}

export function renderType(scaleEl, rulesEl, specimenEl) {
  specimenEl.append(
    specimen("Onest", "font-ui font-medium", "Аа Бб Жж Щщ Ёё Юю", "400 · 500 · 600 · 700"),
    specimen("JetBrains Mono", "num font-medium", `0123456789 ${MINUS}+ ₽ %`, "400 · 500 · 600, tabular-nums"));
  scaleEl.append(el("ol", { class: "border-b border-line", "aria-label": "Шкала кеглей" }, scaleSpecs().map(scaleRow)));
  rulesEl.append(
    el("p", { class: "flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-2" },
      el("span", { class: "flex items-center gap-2" }, revealed(NBSP), "неразрывный пробел"),
      el("span", { class: "flex items-center gap-2" }, revealed(MINUS), "настоящий минус")),
    rulesTable());
}
