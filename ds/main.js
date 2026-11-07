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

function initMobileToc() {
  const list = byId("toc").cloneNode(true);
  list.removeAttribute("id");
  list.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  const details = byId("toc-mobile");
  details.append(el("nav", { "aria-label": "Содержание", class: "max-h-[70vh] overflow-y-auto border-t border-line px-4 py-3" }, list));
  details.addEventListener("click", (event) => {
    if (event.target.closest("a")) details.removeAttribute("open");
  });
}

function initScrollSpy() {
  const links = [...document.querySelectorAll("#toc a[href^='#']")];
  const setCurrent = (id) => links.forEach((a) => {
    if (a.getAttribute("href") === `#${id}`) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
  const observer = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e) => setCurrent(e.target.id));
  }, { rootMargin: "-20% 0px -70% 0px" });
  document.querySelectorAll("main section[id], main .ds-cmp[id]").forEach((s) => observer.observe(s));
}

/* ---------- Theme ---------- */

function initTheme() {
  const root = document.documentElement;
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      root.dataset.theme = next;
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
