/*
  Design-system page entry: renders every section, wires the table of contents
  (scroll-spy + mobile disclosure) and the theme toggle.
*/
import { componentBlock, el, renderError } from "./dom.js";
import { loadTokens } from "./tokens.js";
import { renderColor } from "./color.js";
import { renderType } from "./type.js";
import { renderLayout } from "./layout.js";
import { renderIcons } from "./icons.js";
import { buttonsSpec, inputsSpec, radioSpec, switchSpec } from "./controls.js";
import { badgeSpec, kpiSpec, stripSpec, tableSpec } from "./display.js";
import { aiSpec, alertSpec, emptySpec, skeletonSpec, tabbarSpec, toastSpec } from "./feedback.js";
import { renderHandoff } from "./handoff.js";

const byId = (id) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`нет элемента #${id}`);
  return node;
};

/** Run one section; a failure is shown in place and does not take the page down */
function safely(containerId, label, fn) {
  try {
    return fn();
  } catch (error) {
    renderError(byId(containerId), `Раздел «${label}» не отрисован`, error);
    return null;
  }
}

const COMPONENTS = [buttonsSpec, inputsSpec, switchSpec, radioSpec, badgeSpec, kpiSpec, stripSpec,
  tableSpec, alertSpec, toastSpec, emptySpec, skeletonSpec, aiSpec, tabbarSpec];

function renderComponents() {
  const host = byId("components-list");
  const toc = byId("toc-components");
  COMPONENTS.forEach((build) => {
    const spec = build();
    host.append(componentBlock(spec));
    toc.append(el("li", {}, el("a", { href: `#${spec.id}`, class: "toc-link block py-1 pl-3 text-[13px] text-ink-2 hover:text-ink" }, spec.title)));
  });
}

async function renderTokens() {
  const host = byId("color-table");
  try {
    renderColor(host, await loadTokens());
  } catch (error) {
    renderError(host, "Не удалось прочитать tokens.css — откройте страницу через локальный сервер", error);
  }
}

/* ---------- Table of contents ---------- */

/** Move focus to the target's heading so keyboard users continue from where the link took them */
function focusTarget(hash) {
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  const heading = target?.querySelector("h2, h3") ?? target;
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

function initMobileToc() {
  const list = byId("toc").cloneNode(true);
  list.removeAttribute("id");
  list.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  const details = byId("toc-mobile");
  details.append(el("nav", { "aria-label": "Содержание", class: "max-h-[70vh] overflow-y-auto border-t border-line px-4 py-3" }, list));
  details.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link) return;
    details.removeAttribute("open");
    // The focused link disappears with the closed panel — hand focus to the section instead of <body>
    requestAnimationFrame(() => focusTarget(link.getAttribute("href")));
  });
}

/** Of the sections inside the reading band, the innermost one that starts highest */
function pickCurrent(visible) {
  const leaves = [...visible].filter((n) => ![...visible].some((m) => m !== n && n.contains(m)));
  leaves.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  return leaves[0] ?? null;
}

function initScrollSpy() {
  const links = [...document.querySelectorAll("#toc a[href^='#'], #toc-mobile a[href^='#']")];
  const setCurrent = (id) => links.forEach((a) => {
    if (a.getAttribute("href") === `#${id}`) a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
  const visible = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    const current = pickCurrent(visible);
    if (current) setCurrent(current.id);
  }, { rootMargin: "-20% 0px -70% 0px" });
  document.querySelectorAll("main section[id], main .ds-cmp[id]").forEach((s) => observer.observe(s));
}

/* ---------- Theme ---------- */

const currentTheme = (root) => root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function initTheme() {
  const root = document.documentElement;
  const toggles = [...document.querySelectorAll("[data-theme-toggle]")];
  const sync = () => toggles.forEach((btn) => btn.setAttribute("aria-pressed", String(currentTheme(root) === "dark")));
  sync();
  toggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = currentTheme(root) === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      sync();
      try { localStorage.setItem("q-theme", next); } catch (error) { /* storage blocked — theme lasts this visit only */ }
    });
  });
}

function init() {
  initTheme();
  safely("type-scale", "Типографика", () => renderType(byId("type-scale"), byId("type-rules"), byId("type-specimen")));
  safely("space-scale", "Сетка и отступы", () => renderLayout({
    spaceEl: byId("space-scale"), gridEl: byId("layout-grid"), radiusEl: byId("radius-list"), elevationEl: byId("elevation-list"),
  }));
  const iconPartial = safely("icon-set", "Иконки", () => renderIcons(byId("icon-set"))) ?? "";
  safely("components-list", "Компоненты", renderComponents);
  safely("handoff-config", "Передача в разработку", () => renderHandoff({
    configEl: byId("handoff-config"), namingEl: byId("handoff-naming"), djangoEl: byId("handoff-django"), iconPartial,
  }));
  initMobileToc();
  initScrollSpy();
  renderTokens();
}

init();
