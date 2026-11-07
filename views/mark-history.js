/* Recent check-ins for «Отметка дня». The notes are illustrative (примеры), but each one is
   attached to a real day of the report and agrees with its trades, result and rule status. */
import { formatDate, formatMoney } from "../data.js";
import { currentDays } from "./rule-kinds.js";
import { el, swatch, tradesWord } from "./dom.js";

export const PLAN = Object.freeze({
  yes: { label: "По плану", hint: "Входы и объём — как задумано" },
  partly: { label: "Частично", hint: "Были отступления, но вы их заметили" },
  no: { label: "Не по плану", hint: "Решения принимались по ходу" },
});

export const MOODS = Object.freeze(["Тильт, отыгрыш", "Напряжение", "Ровно", "Собран", "Спокоен и сосредоточен"]);

const EXAMPLES = Object.freeze([
  ["2026-03-27", "yes", 4, "Два стопа подряд — остановился, как договаривались с собой."],
  ["2026-03-26", "yes", 4, "Одна сделка. Второго входа рынок не дал — не стал придумывать."],
  ["2026-03-17", "no", 1, "После четырёх стопов начал увеличивать объём. Остановиться не смог."],
  ["2026-03-16", "partly", 2, "Убыток больше дневного лимита. Ещё злюсь на пятницу."],
  ["2026-03-13", "no", 1, "Отыгрывался. 24 сделки — это не план, это реакция."],
  ["2026-03-12", "partly", 3, "В плюсе, но сделок 25. По правилам день плохой — просто повезло."],
  ["2026-03-11", "yes", 3, "Вернулся после перерыва. Две сделки по плану, обе в минус — бывает."],
]);

function moodDots(mood) {
  return el("span", { class: "flex items-center gap-1", role: "img", "aria-label": `Состояние ${mood} из 5: ${MOODS[mood - 1]}` },
    [1, 2, 3, 4, 5].map((n) => el("span", { class: `h-2 w-2 rounded-full ${n <= mood ? "bg-ink" : "bg-line"}` })));
}

function exampleRow([date, plan, mood, note], days) {
  const day = days.find((d) => d.date === date);
  const { day: d, month, weekday } = formatDate(date);
  const broken = day.broken.length > 0;
  return el("li", { class: "grid gap-x-6 gap-y-1.5 py-4 sm:grid-cols-[120px_1fr_200px]" },
    el("p", { class: "text-[14px] font-medium" }, `${d} ${month}`, el("span", { class: "ml-1.5 font-normal text-ink-3" }, weekday)),
    el("div", {},
      el("p", { class: "flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" },
        el("span", { class: `rounded-sm px-1.5 py-0.5 ${plan === "yes" ? "bg-sunken" : "border border-broken/60"}` }, PLAN[plan].label),
        moodDots(mood)),
      el("p", { class: "mt-1.5 text-[14px] leading-relaxed" }, note)),
    el("p", { class: "flex items-center gap-2 text-[13px] text-ink-2 sm:justify-end" },
      swatch(broken, "h-2.5 w-2.5"),
      el("span", { class: "num" }, `${tradesWord(day.trades)} · `),
      el("span", { class: `num ${day.pnl < 0 ? "text-loss" : "text-gain"}` }, formatMoney(day.pnl))));
}

export function historySection() {
  const days = currentDays();
  return el("section", { "aria-labelledby": "hist-h", class: "mt-12" },
    el("div", { class: "flex flex-wrap items-baseline gap-x-3 gap-y-1" },
      el("h2", { id: "hist-h", class: "text-[17px] font-semibold" }, "Последние отметки"),
      el("span", { class: "rounded-sm border border-line px-1.5 py-0.5 text-[12px] text-ink-2" }, "примеры")),
    el("p", { class: "mt-1 max-w-[64ch] text-[13px] text-ink-2" }, "Заметки иллюстративные; сделки, результат и нарушения — из отчёта. Отметка рядом с цифрами показывает, где решения расходились с планом."),
    el("ol", { class: "mt-3 divide-y divide-line border-y border-line" }, EXAMPLES.map((example) => exampleRow(example, days))));
}
