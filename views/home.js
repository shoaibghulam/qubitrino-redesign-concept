/* «Главная» — today first: result, rule status, check-in, then the period at a glance. */
import { TODAY, disciplineSplit, formatDate, formatMoney } from "../data.js";
import { TRADES } from "../trades.js";
import { el, icon, pageHead, microLabel, tradesWord, daysWord, plural, BTN_PRIMARY, BTN_QUIET } from "./dom.js";
import { staticStrip } from "./strip.js";
import { getState } from "./store.js";
import { RULE_KINDS, currentDays } from "./rule-kinds.js";
import { avgPnl, lossShare, percentText, moneyOrDash } from "./stats.js";

const MARK_LABELS = Object.freeze({ yes: "по плану", partly: "частично по плану", no: "не по плану" });
const OVERTRADE_LIMIT = 10;
const VOLUME_GROWTH = 2; // «объём вырос» = максимальный объём дня ≥ 2× объёма первой сделки
const RECENT_DAYS = 13;

const lots = (v) => v.toLocaleString("ru-RU", { minimumFractionDigits: 2 });

/** Current value of a rule for today, as { used, text } — only for kinds with a meter */
function ruleProgress(rule, today) {
  if (rule.kind === "max-trades") return { used: today.trades, text: `${today.trades} из ${rule.limit}` };
  if (rule.kind === "max-loss") {
    const loss = Math.max(0, -today.pnl);
    return { used: loss, text: `${formatMoney(loss, { sign: false })} из ${formatMoney(rule.limit, { sign: false })}` };
  }
  return null;
}

function ruleMeter(rule, today) {
  const def = RULE_KINDS[rule.kind];
  const progress = ruleProgress(rule, today);
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

function todayVerdict(brokenCount, total) {
  if (!total) return "Включённых правил нет — сегодня видны только деньги.";
  return brokenCount ? `Нарушено правил: ${brokenCount} из ${total}` : `Правила соблюдены: ${total} из ${total}`;
}

function todayPanel(today) {
  const { day, month, weekday } = formatDate(TODAY);
  const rules = getState().rules.filter((r) => r.enabled);
  const brokenCount = rules.filter((r) => RULE_KINDS[r.kind].violated(today, r.limit)).length;
  return el("section", { "aria-labelledby": "today-h", class: "min-w-0 rounded-md border border-line bg-surface p-4 sm:p-6" },
    el("div", { class: "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1" },
      microLabel(`Сегодня · ${weekday}, ${day} ${month}`, "today-h"),
      el("a", { href: `#/deals?day=${TODAY}`, class: "inline-flex min-h-10 items-center text-[13px] text-action hover:underline underline-offset-4" }, "Сделки дня")),
    el("div", { class: "mt-2 flex flex-wrap items-end gap-x-8 gap-y-2" },
      el("p", { class: `num text-[34px] sm:text-[44px] font-medium leading-none tracking-tight ${today.pnl < 0 ? "text-loss" : "text-gain"}` }, formatMoney(today.pnl)),
      el("p", { class: "pb-1 text-[14px] text-ink-2" }, `${tradesWord(today.trades)} · прибыльных ${today.wins}`)),
    el("p", { class: "mt-5 text-[14px] font-medium" },
      todayVerdict(brokenCount, rules.length)),
    el("ul", { class: "mt-1 divide-y divide-line border-t border-line" }, rules.map((r) => ruleMeter(r, today))));
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

/** Busy days on which position size at least doubled during the day — computed from TRADES */
function volumeGrowth(busyDays) {
  const grown = busyDays.map((day) => {
    const trades = TRADES.filter((t) => t.close.startsWith(day.date)).sort((x, y) => (x.open < y.open ? -1 : 1));
    const first = trades[0]?.volume ?? 0;
    const max = Math.max(0, ...trades.map((t) => t.volume));
    return { date: day.date, first, max };
  }).filter((d) => d.first > 0 && d.max >= d.first * VOLUME_GROWTH);
  return [...grown].sort((x, y) => y.max / y.first - x.max / x.first);
}

function volumeFact(busy) {
  const grown = volumeGrowth(busy);
  if (!grown.length) return "";
  const top = grown[0];
  const { day, month } = formatDate(top.date);
  return `В ${grown.length} из ${busy.length} таких дней объём позиции к концу дня вырос минимум вдвое (${day} ${month}: ${lots(top.first)} → ${lots(top.max)} лота). `;
}

function insightHeadline(busyAvg, calmAvg) {
  if (busyAvg === null || calmAvg === null || !(calmAvg < 0) || !(busyAvg < calmAvg)) {
    return `Дни, когда сделок больше ${OVERTRADE_LIMIT}, — главный источник убытка.`;
  }
  return `В дни, когда сделок больше ${OVERTRADE_LIMIT}, средний результат в ${Math.round(busyAvg / calmAvg)} раз хуже.`;
}

function aiInsight(days) {
  const busy = days.filter((d) => d.trades > OVERTRADE_LIMIT);
  const calm = days.filter((d) => d.trades <= OVERTRADE_LIMIT);
  const counted = `${days.length} ${plural(days.length, "торговому дню", "торговым дням", "торговым дням")}`;
  return el("section", { "aria-labelledby": "ai-h", class: "border-l-2 border-ai pl-5" },
    el("h2", { id: "ai-h", class: "flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ai" }, icon("spark", 16), "Наблюдение ИИ"),
    el("p", { class: "mt-3 text-[17px] font-semibold leading-snug" }, insightHeadline(avgPnl(busy), avgPnl(calm))),
    el("dl", { class: "mt-4 grid grid-cols-2 gap-4 text-[13px]" },
      el("div", {}, el("dt", { class: "text-ink-2" }, `> ${OVERTRADE_LIMIT} сделок · ${daysWord(busy.length)}`),
        el("dd", { class: "num mt-1 text-[20px] font-medium text-loss" }, moneyOrDash(avgPnl(busy)))),
      el("div", {}, el("dt", { class: "text-ink-2" }, `≤ ${OVERTRADE_LIMIT} сделок · ${daysWord(calm.length)}`),
        el("dd", { class: "num mt-1 text-[20px] font-medium text-loss" }, moneyOrDash(avgPnl(calm))))),
    el("p", { class: "mt-4 text-[13px] leading-relaxed text-ink-2" },
      `${volumeFact(busy)}Попробуйте жёсткую остановку после ${OVERTRADE_LIMIT}-й сделки — правило уже есть, осталось его соблюдать.`),
    el("p", { class: "mt-2 text-[12px] text-ink-3" }, `Посчитано по ${counted} отчёта MT5.`));
}

function splitLine(days) {
  const { kept, broken, keptPnl, brokenPnl } = disciplineSplit(days);
  const lead = `По правилам — ${kept.length} из ${days.length} ${plural(days.length, "дня", "дней", "дней")}. `;
  if (!broken.length) return [`${lead}Нарушений за период нет.`];
  const share = lossShare(brokenPnl, keptPnl + brokenPnl);
  const where = `На ${broken.length} ${plural(broken.length, "дне", "днях", "днях")} с нарушениями — `;
  const tail = share === null ? "." : `, ${percentText(share)} убытка периода.`;
  return [lead + where, el("span", { class: "num text-loss" }, formatMoney(brokenPnl)), tail];
}

function recentStrip(allDays) {
  const days = allDays.slice(-RECENT_DAYS);
  const broken = days.filter((d) => d.broken.length).length;
  return el("section", { "aria-labelledby": "recent-h", class: "min-w-0" },
    el("div", { class: "flex items-baseline justify-between gap-4" },
      el("h2", { id: "recent-h", class: "text-[17px] font-semibold" }, "Отметки дней"),
      el("a", { href: "#/numbers", class: "inline-flex min-h-10 items-center gap-1.5 text-[13px] text-action hover:underline underline-offset-4" }, "Все цифры", icon("arrow", 16))),
    el("p", { class: "sr-only" }, `${daysWord(days.length)} периода: по правилам ${days.length - broken}, с нарушениями ${broken}. Сегодняшний день — последний.`),
    el("div", { class: "mt-3" }, staticStrip(days, { size: "mini", highlight: TODAY })),
    el("p", { class: "mt-3 text-[13px] text-ink-2" }, splitLine(allDays)));
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
  const days = currentDays();
  const today = days.find((d) => d.date === TODAY);
  root.append(
    pageHead("Кабинет · счёт 5000000001", "Главная"),
    el("div", { class: "mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10" },
      el("div", { class: "grid min-w-0 content-start gap-6" }, todayPanel(today), markCta(), recentStrip(days)),
      el("div", { class: "grid min-w-0 content-start gap-8" }, aiInsight(days), reportShortcut())));
}

export default Object.freeze({ title: "Главная", render });
