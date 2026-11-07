/*
  Data display: rule badge, KPI row, day strip, table.
  All numbers come from data.js — the same figures the cabinet shows.
*/
import { el, serialize } from "./dom.js";
import { DAYS, RULES, SUMMARY, formatDate, formatMoney } from "../data.js";

const RULE_SHORT = Object.freeze({ "max-trades": "> 10 сделок", "max-loss": "убыток > 2 000 ₽" });
const STRIP_MAX_PX = 104;
const dayPnl = (iso) => DAYS.find((d) => d.date === iso)?.pnl ?? 0;
const STRIP_MIN_PX = 12;

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/* ---------- Rule badge ---------- */

export function ruleBadge(text, broken) {
  if (!broken) {
    return el("span", { class: "inline-flex items-center gap-1.5 rounded-sm border border-line px-2 py-0.5 text-[12px] text-ink-2" },
      el("span", { class: "inline-block h-2 w-2 rounded-full bg-kept", "aria-hidden": "true" }), text);
  }
  return el("span", { class: "inline-flex items-center gap-1.5 rounded-sm border border-broken/60 px-2 py-0.5 text-[12px] text-ink" },
    el("span", { class: "hatch inline-block h-2 w-2 rounded-full", "aria-hidden": "true" }), text,
    el("span", { class: "sr-only" }, " — нарушено"));
}

export function badgeSpec() {
  const kept = ruleBadge("соблюдены", false);
  const broken = ruleBadge(RULE_SHORT["max-trades"], true);
  const demo = el("div", { class: "flex flex-wrap items-center gap-3" },
    kept, broken, ruleBadge(RULE_SHORT["max-loss"], true));
  return {
    id: "cmp-badge", title: "Метка правила",
    lede: "Поведение, не деньги: соблюдено — сплошная точка цвета текста, нарушено — янтарь со штриховкой. Без зелёного и красного, чтобы прибыльный день с нарушением не выглядел хорошим.",
    demo,
    notes: ["Текст метки говорит, что именно нарушено, а не «ошибка». Для скринридера добавлено «— нарушено»."],
    snippet: serialize(kept, broken),
  };
}

/* ---------- KPI row ---------- */

function kpiRow(label, value, tone = "") {
  return el("div", { class: "flex items-baseline justify-between gap-4 py-2.5" },
    el("dt", { class: "text-ink-2" }, label),
    el("dd", { class: `num text-right font-medium ${tone}` }, value));
}

export function kpiSpec() {
  const rows = [
    kpiRow("Итог периода", formatMoney(SUMMARY.netProfit, { decimals: 2 }), "text-loss"),
    kpiRow("Сделок", String(SUMMARY.trades)),
    kpiRow("Прибыльных", `${SUMMARY.winRate.toLocaleString("ru-RU")} %`),
    kpiRow("Профит-фактор", SUMMARY.profitFactor.toLocaleString("ru-RU")),
    kpiRow("Убытков подряд, макс.", String(SUMMARY.maxLossStreak)),
  ];
  const list = el("dl", { class: "max-w-[340px] divide-y divide-line border-y border-line text-[14px]" }, rows);
  return {
    id: "cmp-kpi", title: "Ключевые цифры",
    lede: "Список, не сетка карточек: подпись слева, число справа, хайрлайн между строками. Цвет — только у денег.",
    demo: list,
    notes: ["dl/dt/dd — скринридер читает пару «подпись — значение». Числа выровнены по правому краю и моноширинны."],
    snippet: serialize(el("dl", { class: list.getAttribute("class") }, rows[0].cloneNode(true), rows[1].cloneNode(true))),
  };
}

/* ---------- Day strip ---------- */

function describeDay(day) {
  const { day: d, month, weekday } = formatDate(day.date);
  const rules = day.broken.length
    ? `нарушено: ${day.broken.map((id) => RULES.find((r) => r.id === id).label.toLowerCase()).join("; ")}`
    : "все правила соблюдены";
  return `${d} ${month}, ${weekday} — ${day.trades} ${plural(day.trades, "сделка", "сделки", "сделок")}, ${formatMoney(day.pnl)}; ${rules}`;
}

function stripBar(day, maxTrades, onSelect) {
  // √ scale: one 43-trade day must not flatten every normal day into a sliver
  const height = Math.max(STRIP_MIN_PX, Math.round(Math.sqrt(day.trades / maxTrades) * STRIP_MAX_PX));
  const btn = el("button", {
    type: "button", "data-date": day.date, "aria-pressed": "false", "aria-label": describeDay(day),
    class: "flex h-full w-full flex-col justify-end rounded-sm px-1 pt-1 transition-transform duration-200 hover:-translate-y-0.5 aria-pressed:bg-sunken aria-pressed:ring-2 aria-pressed:ring-action",
  },
  el("span", { class: `block w-full rounded-[4px] ${day.broken.length ? "hatch" : "bg-kept"}`, style: `height:${height}px` }),
  el("span", { class: "num mt-1.5 block text-center text-[12px] text-ink-2" }, String(formatDate(day.date).day)));
  btn.addEventListener("click", () => onSelect(day));
  return el("li", { class: "h-full min-w-[40px] flex-1" }, btn);
}

export function stripSpec() {
  const maxTrades = Math.max(...DAYS.map((d) => d.trades));
  const detail = el("p", { class: "mt-3 min-h-[48px] rounded-sm bg-sunken px-4 py-3 text-[14px]", "aria-live": "polite" });
  const list = el("ol", { class: "flex h-[146px] items-end gap-1.5 overflow-x-auto px-1 pb-1 pt-1", "aria-label": "Торговые дни периода" });
  const select = (day) => {
    list.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.date === day.date)));
    detail.textContent = describeDay(day);
  };
  DAYS.forEach((day) => list.append(stripBar(day, maxTrades, select)));
  select(DAYS.reduce((a, b) => (b.pnl < a.pnl ? b : a)));

  const legend = el("p", { class: "mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2" },
    el("span", { class: "flex items-center gap-2" }, el("span", { class: "inline-block h-3 w-3 rounded-[3px] bg-kept" }), "по правилам"),
    el("span", { class: "flex items-center gap-2" }, el("span", { class: "hatch inline-block h-3 w-3 rounded-[3px]" }), "с нарушением"),
    el("span", {}, "высота — √ числа сделок"));
  return {
    id: "cmp-strip", title: "Отметки дней",
    lede: "Фирменный компонент. Один столбик — один торговый день. Тот же рисунок на лендинге, в кабинете, на телефоне и в печати.",
    demo: el("div", {}, legend, list, detail),
    notes: [
      "Каждый день — кнопка с aria-pressed и полным описанием в aria-label; подробности объявляются через aria-live.",
      "Шкала √(сделки / максимум): день с 43 сделками не сплющивает дни с 3–5.",
      "Ширина кнопки ≥ 40px; на узком экране полоса прокручивается внутри себя.",
    ],
    snippet: serialize(list.firstElementChild),
  };
}

/* ---------- Table ---------- */

function tableRow(day) {
  const { day: d, month, weekday } = formatDate(day.date);
  const rules = day.broken.length
    ? el("span", { class: "flex flex-wrap gap-1.5" }, day.broken.map((id) => ruleBadge(RULE_SHORT[id], true)))
    : el("span", { class: "text-ink-2" }, "соблюдены");
  return el("tr", { class: "border-b border-line last:border-0" },
    el("th", { scope: "row", class: "whitespace-nowrap px-4 py-2.5 text-left font-normal" }, `${d} ${month}`, el("span", { class: "ml-1.5 text-ink-2" }, weekday)),
    el("td", { class: "num px-4 py-2.5 text-right" }, String(day.trades)),
    el("td", { class: `num whitespace-nowrap px-4 py-2.5 text-right font-medium ${day.pnl < 0 ? "text-loss" : "text-gain"}` }, formatMoney(day.pnl)),
    el("td", { class: "px-4 py-2.5" }, rules));
}

export function tableSpec() {
  const picked = ["2026-02-27", "2026-03-02", "2026-03-12", "2026-03-17", "2026-03-30"];
  const rows = DAYS.filter((d) => picked.includes(d.date)).map(tableRow);
  const head = el("thead", { class: "text-left text-[11px] uppercase tracking-[0.08em] text-ink-2" },
    el("tr", { class: "border-b border-line" },
      el("th", { scope: "col", class: "px-4 py-3 font-medium" }, "День"),
      el("th", { scope: "col", class: "px-4 py-3 text-right font-medium" }, "Сделки"),
      el("th", { scope: "col", class: "px-4 py-3 text-right font-medium" }, "Результат"),
      el("th", { scope: "col", class: "px-4 py-3 font-medium" }, "Правила")));
  const table = el("table", { class: "w-full min-w-[520px] text-[14px]" },
    el("caption", { class: "sr-only" }, "Результат по дням"), head, el("tbody", {}, rows));
  const wrap = el("div", { class: "relative overflow-x-auto rounded-md border border-line bg-surface", role: "region", tabindex: "0", "aria-label": "По дням" }, table);
  return {
    id: "cmp-table", title: "Таблица", stage: "plain",
    lede: "Числа — по правому краю и моноширинные, чтобы разряды стояли столбиком. Текст — по левому. Шапка — микро-метка ink-2.",
    demo: wrap,
    notes: [
      `2 марта: +/− и цвет — про деньги, метка справа — про поведение. 12 марта: ${formatMoney(dayPnl("2026-03-12"))}, но правило нарушено.`,
      "Широкая таблица прокручивается внутри обёртки с role=\"region\" и tabindex — страница не уезжает вбок.",
    ],
    snippet: serialize(el("div", { class: wrap.getAttribute("class") },
      el("table", { class: table.getAttribute("class") }, head.cloneNode(true), el("tbody", {}, rows[1].cloneNode(true))))),
  };
}
