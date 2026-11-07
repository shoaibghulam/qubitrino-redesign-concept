/*
  Feedback & surfaces: alert, toast, empty state, skeleton, AI insight, mobile tab bar.
*/
import { el, serialize } from "./dom.js";
import { icon } from "./icons.js";
import { DAYS, disciplineSplit, formatMoney } from "../data.js";

const TOAST_MS = 5000;

/* ---------- Alert ---------- */

function alertBox(kind, title, text) {
  const isError = kind === "error";
  return el("div", {
    role: isError ? "alert" : "status",
    class: `flex gap-3 rounded-sm border-l-2 px-4 py-3 text-[14px] ${isError ? "border-loss bg-loss/[0.06]" : "border-ink-3 bg-sunken"}`,
  },
  icon(isError ? "alert" : "info", 20, `mt-px ${isError ? "text-loss" : "text-ink-2"}`),
  el("div", {},
    el("p", { class: "font-medium" }, title),
    el("p", { class: "mt-0.5 text-ink-2" }, text)));
}

export function alertSpec() {
  const info = alertBox("info", "Отчёт MT5 загружен частично", "Сделки до 24 февраля в файле отсутствуют — период начинается с первой найденной сделки.");
  const error = alertBox("error", "Не удалось прочитать файл", "Это не отчёт MT5 в формате HTML. Сохраните его из терминала: «Отчёт → HTML» и загрузите снова.");
  return {
    id: "cmp-alert", title: "Сообщение",
    lede: "Встроенное в поток, рядом с причиной. Говорит, что случилось и что сделать дальше. Без восклицательных знаков.",
    demo: el("div", { class: "grid max-w-[640px] gap-3" }, info, error),
    notes: ["Ошибка — role=\"alert\", справка — role=\"status\". Иконка дублирует цвет кромки; текст — ink и ink-2, не цветной."],
    snippet: serialize(error),
  };
}

/* ---------- Toast ---------- */

function toastNode(text) {
  return el("div", {
    class: "pointer-events-auto flex items-center gap-3 rounded-md bg-ink px-4 py-3 text-[14px] text-paper shadow-[0_8px_24px_-12px_rgb(0_0_0/0.45)] transition duration-200 translate-y-2 opacity-0",
  }, icon("check", 18), el("span", {}, text));
}

export function toastSpec() {
  const region = el("div", { class: "pointer-events-none mt-4 flex min-h-[52px] items-end", role: "status", "aria-live": "polite" });
  const trigger = el("button", {
    type: "button",
    class: "inline-flex h-10 items-center rounded-sm bg-action px-4 text-[14px] font-medium text-on-action hover:bg-action/90 transition-colors",
  }, "Сохранить отметку");
  let timer = 0;
  trigger.addEventListener("click", () => {
    clearTimeout(timer);
    region.replaceChildren(toastNode("Отметка за 30 марта сохранена"));
    requestAnimationFrame(() => region.firstElementChild.classList.remove("translate-y-2", "opacity-0"));
    timer = setTimeout(() => region.replaceChildren(), TOAST_MS);
  });
  const sample = toastNode("Отметка за 30 марта сохранена");
  sample.classList.remove("translate-y-2", "opacity-0");
  return {
    id: "cmp-toast", title: "Тост",
    lede: "Только подтверждение того, что пользователь сам сделал. Инвертированная поверхность, не зелёная: успех сохранения — не прибыль.",
    demo: el("div", { class: "grid items-start gap-6 sm:grid-cols-[auto_1fr]" },
      el("div", {}, trigger, region),
      el("figure", { class: "sm:justify-self-end" },
        el("div", { "aria-hidden": "true" }, sample.cloneNode(true)),
        el("figcaption", { class: "mt-2 text-[12px] text-ink-2" }, "Так выглядит тост — внизу справа на десктопе, над таб-баром на телефоне."))),
    notes: [`Живая область role="status" существует заранее, тост вставляется в неё; исчезает через ${TOAST_MS / 1000} с.`, "Появление — opacity + translate, без движения при prefers-reduced-motion."],
    snippet: serialize(el("div", { role: "status", "aria-live": "polite", class: "fixed inset-x-4 bottom-20 lg:bottom-6 lg:left-auto lg:right-6" }, sample)),
  };
}

/* ---------- Empty state ---------- */

export function emptySpec() {
  const ghost = el("div", { class: "flex h-14 items-end gap-1.5", "aria-hidden": "true" },
    [18, 30, 22, 44, 14, 26].map((h) => el("span", { class: "block w-3 rounded-[3px] border border-dashed border-ink-3/70", style: `height:${h}px` })));
  const block = el("div", { class: "max-w-[420px]" },
    ghost,
    el("h4", { class: "mt-5 text-[17px] font-semibold" }, "Сделок пока нет"),
    el("p", { class: "mt-1.5 text-[14px] leading-relaxed text-ink-2" }, "Загрузите отчёт MT5 в HTML — отметки дней и цифры появятся сразу. Счёт подключать не нужно."),
    el("div", { class: "mt-5 flex flex-wrap gap-3" },
      el("button", { type: "button", class: "inline-flex h-10 items-center gap-2 rounded-sm bg-action px-4 text-[14px] font-medium text-on-action hover:bg-action/90 transition-colors" }, icon("plus", 18), "Загрузить отчёт"),
      el("a", { href: "report.html", class: "inline-flex h-10 items-center rounded-sm px-3 text-[14px] font-medium text-action underline-offset-4 hover:underline" }, "Как выглядит отчёт")));
  return {
    id: "cmp-empty", title: "Пустое состояние",
    lede: "Контур будущих отметок дней вместо иллюстрации: пользователь сразу видит, что здесь появится. Одно действие, одна ссылка.",
    demo: block,
    snippet: serialize(block),
  };
}

/* ---------- Skeleton ---------- */

export function skeletonSpec() {
  const bar = (w, h = "h-3") => el("span", { class: `block ${h} rounded-[4px] bg-sunken motion-safe:animate-pulse`, style: `width:${w}` });
  const block = el("div", { "aria-busy": "true", "aria-live": "polite", class: "max-w-[520px]" },
    el("span", { class: "sr-only" }, "Загружаем сделки…"),
    el("div", { "aria-hidden": "true", class: "space-y-3" },
      bar("40%", "h-3"), bar("62%", "h-9"),
      el("div", { class: "flex h-[72px] items-end gap-1.5 pt-2" }, [40, 64, 30, 72, 52, 22, 58].map((p) =>
        el("span", { class: "block flex-1 rounded-[4px] bg-sunken motion-safe:animate-pulse", style: `height:${p}px` })))));
  return {
    id: "cmp-skeleton", title: "Загрузка",
    lede: "Скелетон повторяет форму будущего контента — не спиннер на весь экран. Пульсирует только opacity и только при motion-safe.",
    demo: block,
    notes: ["aria-busy на контейнере и скрытый текст «Загружаем сделки…»; когда данные пришли — aria-busy=\"false\"."],
    snippet: serialize(block),
  };
}

/* ---------- AI insight ---------- */

export function aiSpec() {
  const { broken, brokenPnl, keptPnl } = disciplineSplit(DAYS);
  const share = Math.round((brokenPnl / (brokenPnl + keptPnl)) * 100);
  const worst = DAYS.reduce((a, b) => (b.pnl < a.pnl ? b : a));
  const block = el("aside", { "aria-labelledby": "ds-ai-h", class: "max-w-[640px] border-l-2 border-ai py-1 pl-5" },
    el("p", { id: "ds-ai-h", class: "flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ai" }, icon("ai", 16), "Разбор ИИ · неделя"),
    el("p", { class: "mt-3 text-[17px] font-medium leading-snug" },
      `${share} % убытка — ${broken.length} дней, когда правила были нарушены. Худший — 2 марта: ${worst.trades} сделки при лимите 10, ${formatMoney(worst.pnl)}.`),
    el("p", { class: "mt-2 text-[14px] leading-relaxed text-ink-2" },
      "В дни по правилам результат почти ноль. Попробуйте жёсткую паузу после 10-й сделки: не стоп торговли, а 30 минут до следующего входа."),
    el("p", { class: "mt-3 text-[12px] text-ink-2" }, "Цифры взяты из журнала сделок. Совет — гипотеза, проверьте её на следующей неделе."));
  return {
    id: "cmp-ai", title: "Блок ИИ-разбора",
    lede: "Фиолетовый живёт только здесь: пользователь должен с одного взгляда отличать вывод модели от собственных цифр. Кромка и метка — фиолетовые, сам текст — обычный ink.",
    demo: block,
    notes: ["Каждый вывод ИИ ссылается на конкретные числа из журнала и заканчивается проверяемой гипотезой — без «молодец!» и без прогнозов цены."],
    snippet: serialize(block),
  };
}

/* ---------- Bottom tab bar ---------- */

const TABS = Object.freeze([["Главная", "home"], ["Сделки", "deals"], ["Цифры", "numbers", true], ["Отметка", "mark"], ["Отчёты", "reports"]]);

export function tabbarSpec() {
  const items = TABS.map(([label, key, current]) => el("li", {},
    el("a", {
      href: "#cmp-tabbar", "aria-current": current ? "page" : null,
      class: `flex min-h-[56px] flex-col items-center justify-center gap-1 ${current ? "font-medium text-action" : "text-ink-2"}`,
    }, icon(key, 20), label)));
  const nav = el("nav", { "aria-label": "Разделы кабинета (пример)", class: "border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" },
    el("ul", { class: "grid grid-cols-5 text-[11px]" }, items));
  const phone = el("div", { class: "mx-auto w-full max-w-[390px] overflow-hidden rounded-md border border-line bg-paper" },
    el("div", { class: "h-24 px-4 pt-4", "aria-hidden": "true" },
      el("span", { class: "block h-3 w-1/3 rounded-[3px] bg-sunken" }),
      el("span", { class: "mt-3 block h-7 w-2/3 rounded-[3px] bg-sunken" })),
    nav);
  return {
    id: "cmp-tabbar", title: "Нижняя навигация (мобильная)",
    lede: "Пять разделов, а не семь: «Правила» и «Неделя» на телефоне открываются с главной. Текущий раздел — синий и полужирный: два сигнала, не один.",
    demo: phone, stage: "plain",
    notes: ["В продукте — fixed inset-x-0 bottom-0 + отступ safe-area; основному контенту — pb-28, чтобы фокус не прятался под панелью."],
    snippet: serialize(nav),
  };
}
