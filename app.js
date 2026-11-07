/* Cabinet shell: hash router, navigation (sidebar / tab bar / «Ещё» sheet), theme. */
import { el, icon, pageHead, BTN_PRIMARY } from "./views/dom.js";
import { getState, subscribe } from "./views/store.js";
import home from "./views/home.js";
import deals from "./views/deals.js";
import numbers from "./views/numbers.js";
import rules from "./views/rules.js";
import mark from "./views/mark.js";
import week from "./views/week.js";
import reports from "./views/reports.js";

const ROUTES = Object.freeze({ home, deals, numbers, rules, mark, week, reports });
const DEFAULT_ROUTE = "home";
const TITLE_SUFFIX = "кабинет Qubitrino (концепт)";

const NAV = Object.freeze([
  ["Главная", "home"], ["Мои сделки", "deals"], ["Мои цифры", "numbers"], ["Правила", "rules"],
  ["Отметка дня", "mark"], ["Неделя", "week"], ["Отчёты", "reports"],
]);
const TABS = Object.freeze([["Главная", "home"], ["Сделки", "deals"], ["Отметка", "mark"], ["Цифры", "numbers"]]);
const MORE = Object.freeze([["Правила", "rules"], ["Неделя", "week"], ["Отчёты", "reports"]]);

const SIDE_LINK = "flex min-h-10 items-center gap-3 rounded-sm px-3 py-2 text-ink-2 hover:bg-sunken hover:text-ink transition-colors aria-[current=page]:bg-sunken aria-[current=page]:font-medium aria-[current=page]:text-ink";
const TAB_LINK = "flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-ink-2 aria-[current=page]:font-medium aria-[current=page]:text-action";
const MORE_LINK = "flex min-h-12 items-center gap-3 rounded-sm px-3 text-ink hover:bg-sunken aria-[current=page]:bg-sunken aria-[current=page]:font-medium";

let cleanup = null;
let firstRender = true;

/* ---------- Navigation ---------- */

/** «Отметка дня» carries a small amber marker while today's check-in is missing */
function markBadge(cls) {
  return el("span", { class: `${cls} h-2 w-2 rounded-full bg-broken`, "data-mark-badge": "", "aria-hidden": "true" });
}

function navLink(label, key, cls, withBadge) {
  const link = el("a", { href: `#/${key}`, "data-route": key, class: cls }, icon(key), el("span", {}, label));
  if (key === "mark" && withBadge) link.append(markBadge(withBadge));
  return link;
}

function renderNav() {
  const side = document.getElementById("side-nav");
  NAV.forEach(([label, key]) => side.append(el("li", {}, navLink(label, key, SIDE_LINK, "ml-auto"))));

  const tabs = document.getElementById("tab-nav");
  TABS.forEach(([label, key]) => tabs.append(el("li", { class: "relative" }, navLink(label, key, TAB_LINK, "absolute right-[30%] top-2.5"))));
  const moreBtn = el("button", {
    type: "button", id: "more-open", "aria-haspopup": "dialog", "aria-controls": "more-sheet",
    class: `${TAB_LINK} data-[active]:font-medium data-[active]:text-action`,
  }, icon("more"), el("span", {}, "Ещё"));
  tabs.append(el("li", {}, moreBtn));

  const more = document.getElementById("more-nav");
  MORE.forEach(([label, key]) => more.append(el("li", {}, navLink(label, key, MORE_LINK))));
}

function updateNav(route) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    if (link.dataset.route === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  // «Ещё» is a button, so it gets a visual state only; the link inside the sheet carries aria-current
  document.getElementById("more-open").toggleAttribute("data-active", MORE.some(([, key]) => key === route));
}

function updateBadges(state) {
  document.querySelectorAll("[data-mark-badge]").forEach((badge) => badge.classList.toggle("hidden", Boolean(state.todayMark)));
}

function initSheet() {
  const sheet = document.getElementById("more-sheet");
  document.getElementById("more-close").append(icon("close"));
  document.getElementById("more-open").addEventListener("click", () => sheet.showModal());
  document.getElementById("more-close").addEventListener("click", () => sheet.close());
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet || event.target.closest("a")) sheet.close();
  });
}

/* ---------- Router ---------- */

function routeFromHash() {
  if (!location.hash.startsWith("#/")) return DEFAULT_ROUTE;
  const key = location.hash.slice(2).split(/[?/]/)[0];
  return key || DEFAULT_ROUTE;
}

function notFound() {
  return {
    title: "Раздел не найден",
    render(root) {
      root.append(pageHead("Ошибка адреса", "Такого раздела нет",
        "Ссылка устарела или в ней опечатка. Все разделы кабинета — в меню."),
      el("a", { href: "#/home", class: `${BTN_PRIMARY} mt-6` }, "На главную"));
    },
  };
}

function render() {
  const route = routeFromHash();
  const view = ROUTES[route] ?? notFound();
  const root = document.getElementById("view");
  if (typeof cleanup === "function") cleanup();
  root.replaceChildren();
  cleanup = view.render(root) ?? null;
  document.title = `${view.title} — ${TITLE_SUFFIX}`;
  updateNav(route);
  if (!firstRender) {
    window.scrollTo(0, 0);
    root.querySelector("h1")?.focus();
  }
  firstRender = false;
}

/* ---------- Theme ---------- */

function currentTheme() {
  const root = document.documentElement;
  return root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function initTheme() {
  const toggle = document.getElementById("theme-toggle");
  toggle.setAttribute("aria-pressed", String(currentTheme() === "dark"));
  toggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    toggle.setAttribute("aria-pressed", String(next === "dark"));
    try { localStorage.setItem("q-theme", next); } catch (e) { /* storage blocked — theme lasts this visit only */ }
  });
}

renderNav();
initSheet();
initTheme();
updateBadges(getState());
subscribe(updateBadges);
// In-page anchors such as the skip link (#main) are not routes — leave the current view alone
window.addEventListener("hashchange", () => { if (location.hash.startsWith("#/") || !location.hash) render(); });
render();
