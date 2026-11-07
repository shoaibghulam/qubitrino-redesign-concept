/* «Главная» — today first: result, rule status, check-in, then the period at a glance. */
import { DAYS, TODAY, disciplineSplit, formatDate, formatMoney } from "../data.js";
import { el, icon, pageHead, microLabel, tradesWord, daysWord, BTN_PRIMARY, BTN_QUIET } from "./dom.js";
import { staticStrip } from "./strip.js";
import { getState } from "./store.js";
import { RULE_KINDS } from "./rule-kinds.js";

const MARK_LABELS = Object.freeze({ yes: "по плану", partly: "частично по плану", no: "не по плану" });
const OVERTRADE_LIMIT = 10;
const RECENT_DAYS = 13;

const today = DAYS.find((d) => d.date === TODAY);

/** Current value of a rule for today, as { used, limit, text } — only for kinds with a meter */
function ruleProgress(rule) {
  if (rule.kind === "max-trades") return { used: today.trades, text: `${today.trades} из ${rule.limit}` };
  if (rule.kind === "max-loss") {
    const loss = Math.max(0, -today.pnl);
    return { used: loss, text: `${formatMoney(-loss)} из ${formatMoney(-rule.limit)}` };
  }
  return null;
}

function ruleMeter(rule) {
  const def = RULE_KINDS[rule.kind];
  const progress = ruleProgress(rule);
  const broken = def.violated(today, rule.limit);
  const ratio = progress ? Math.min(1, progress.used / rule.limit) : 0;
  return el("li", { class: "py-3" },
    el("div", { class: "flex items-baseline justify-between gap-3 text-[14px]" },
      el("span", {}, def.label(rule.limit)),
      el("span", { class: `shrink-0 text-[13px] ${broken ? "font-medium" : "text-ink-2"}` }, broken ? "нарушено" : "соблюдено")),
    progress ? el("div", { class: "mt-2 flex items-center gap-3" },
      el("span", { class: "relative block h-1.5 flex-1 overflow-hidden rounded-full bg-sunken", "aria-hidden": "true" },
        el("span", { class: `absolute inset-y-0 left-0 w-full origin-left rounded-full ${broken ? "hatch" : "bg-kept"}`, style: `transform:scaleX(${ratio.toFixed(3)})` })),
      el("span", { class: "num shrink-0 text-right sm:w-[150px] text-[12px] text-ink-2" }, progress.text)) : null);
}

function todayPanel() {
  const { day, month, weekday } = formatDate(TODAY);
  const rules = getState().rules.filter((r) => r.enabled);
  const brokenCount = rules.filter((r) => RULE_KINDS[r.kind].violated(today, r.limit)).length;
  return el("section", { "aria-labelledby": "today-h", class: "rounded-md border border-line bg-surface p-5 sm:p-6" },
    el("div", { class: "flex flex-wrap items-baseline justify-between gap-2" },
      microLabel(`Сегодня · ${weekday}, ${day} ${month}`, "today-h"),
      el("a", { href: "#/deals", class: "text-[13px] text-action hover:underline underline-offset-4" }, "Сделки дня")),
    el("div", { class: "mt-3 flex flex-wrap items-end gap-x-8 gap-y-2" },
      el("p", { class: `num text-[40px] sm:text-[44px] font-medium leading-none tracking-tight ${today.pnl < 0 ? "text-loss" : "text-gain"}` }, formatMoney(today.pnl)),
      el("p", { class: "pb-1 text-[14px] text-ink-2" }, `${tradesWord(today.trades)} · прибыльных ${today.wins}`)),
    el("p", { class: "mt-5 text-[14px] font-medium" },
      brokenCount ? `Нарушено правил: ${brokenCount} из ${rules.length}` : `Правила соблюдены: ${rules.length} из ${rules.length}`),
    el("ul", { class: "mt-1 divide-y divide-line border-t border-line" }, rules.map(ruleMeter)));
}

function markCta() {
  const mark = getState().todayMark;
  if (mark) {
    return el("section", { "aria-labelledby": "cta-h", class: "flex flex-wrap items-center gap-4 border-y border-line py-4" },
      el("span", { class: "grid h-10 w-10 place-items-center rounded-full bg-sunken" }, icon("mark")),
      el("div", { class: "mr-auto" },
        el("h2", { id: "cta-h", class: "text-[15px] font-semibold" }, "Отметка дня сделана"),
        el("p", { class: "text-[13px] text-ink-2" }, `День ${MARK_LABELS[mark.plan]} · состояние ${mark.mood} из 5`)),
      el("a", { href: "#/mark", class: BTN_QUIET }, "Изменить"));
  }
  return el("section", { "aria-labelledby": "cta-h", class: "flex flex-wrap items-center gap-4 rounded-md border border-broken/50 bg-broken/[0.06] px-5 py-4" },
    el("div", { class: "mr-auto max-w-[44ch]" },
      el("h2", { id: "cta-h", class: "text-[15px] font-semibold" }, "Отметка дня ещё не сделана"),
      el("p", { class: "mt-0.5 text-[13px] text-ink-2" }, "Минута: шли ли вы по плану и в каком состоянии торговали. Без отметок недельный обзор пустеет.")),
    el("a", { href: "#/mark", class: BTN_PRIMARY }, "Сделать отметку", icon("arrow", 18)));
}

const avg = (list) => list.reduce((s, d) => s + d.pnl, 0) / list.length;

function aiInsight() {
  const busy = DAYS.filter((d) => d.trades > OVERTRADE_LIMIT);
  const calm = DAYS.filter((d) => d.trades <= OVERTRADE_LIMIT);
  const ratio = Math.round(avg(busy) / avg(calm));
  return el("section", { "aria-labelledby": "ai-h", class: "border-l-2 border-ai pl-5" },
    el("h2", { id: "ai-h", class: "flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ai" }, icon("spark", 16), "Наблюдение ИИ"),
    el("p", { class: "mt-3 text-[17px] font-semibold leading-snug" },
      `В дни, когда сделок больше ${OVERTRADE_LIMIT}, средний результат в ${ratio} раз хуже.`),
    el("dl", { class: "mt-4 grid grid-cols-2 gap-4 text-[13px]" },
      el("div", {}, el("dt", { class: "text-ink-2" }, `> ${OVERTRADE_LIMIT} сделок · ${daysWord(busy.length)}`),
        el("dd", { class: "num mt-1 text-[20px] font-medium text-loss" }, formatMoney(avg(busy)))),
      el("div", {}, el("dt", { class: "text-ink-2" }, `≤ ${OVERTRADE_LIMIT} сделок · ${daysWord(calm.length)}`),
        el("dd", { class: "num mt-1 text-[20px] font-medium text-loss" }, formatMoney(avg(calm))))),
    el("p", { class: "mt-4 text-[13px] leading-relaxed text-ink-2" },
      "Это не про рынок: в те же дни растёт объём позиции после убытка. Попробуйте жёсткую остановку после 10-й сделки — правило уже есть, его стоит не нарушать."),
    el("p", { class: "mt-2 text-[12px] text-ink-3" }, "Посчитано по 13 торговым дням отчёта MT5."));
}

function recentStrip() {
  const days = DAYS.slice(-RECENT_DAYS);
  const broken = days.filter((d) => d.broken.length).length;
  const { keptPnl, brokenPnl } = disciplineSplit(DAYS);
  return el("section", { "aria-labelledby": "recent-h" },
    el("div", { class: "flex items-baseline justify-between gap-4" },
      el("h2", { id: "recent-h", class: "text-[17px] font-semibold" }, "Отметки дней"),
      el("a", { href: "#/numbers", class: "inline-flex min-h-10 items-center gap-1.5 text-[13px] text-action hover:underline underline-offset-4" }, "Все цифры", icon("arrow", 16))),
    el("p", { class: "sr-only" }, `${daysWord(days.length)} периода: по правилам ${days.length - broken}, с нарушениями ${broken}. Сегодняшний день — последний.`),
    el("div", { class: "mt-3" }, staticStrip(days, { size: "mini", highlight: TODAY })),
    el("p", { class: "mt-3 text-[13px] text-ink-2" },
      `По правилам — ${days.length - broken} из ${days.length} дней. На ${broken} днях с нарушениями — `,
      el("span", { class: "num text-loss" }, formatMoney(brokenPnl)), `, ${Math.round((brokenPnl / (keptPnl + brokenPnl)) * 100)} % убытка периода.`));
}

function reportShortcut() {
  return el("a", { href: "#/reports", class: "group flex items-center gap-4 rounded-md border border-line px-5 py-4 hover:border-ink-3 transition-colors" },
    icon("reports"),
    el("span", { class: "mr-auto" },
      el("span", { class: "block text-[15px] font-medium" }, "Отчёт за период"),
      el("span", { class: "block text-[13px] text-ink-2" }, "A4 для себя или наставника — дисциплина, сделки, сводка ИИ")),
    el("span", { class: "transition-transform group-hover:translate-x-0.5" }, icon("arrow", 18)));
}

function render(root) {
  root.append(
    pageHead("Кабинет · счёт 5000000001", "Главная"),
    el("div", { class: "mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10" },
      el("div", { class: "grid content-start gap-6" }, todayPanel(), markCta(), recentStrip()),
      el("div", { class: "grid content-start gap-8" }, aiInsight(), reportShortcut())));
}

export default Object.freeze({ title: "Главная", render });
