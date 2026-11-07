/*
  Icon set: inline SVG, viewBox 24, stroke 1.7, round caps and joins.
  Navigation paths are identical to app.js so the product and this page match.
*/
import { el, svg } from "./dom.js";

export const NAV_ICONS = Object.freeze({
  home: "M4 11l8-7 8 7v9H4z",
  deals: "M4 6h16M4 12h16M4 18h10",
  numbers: "M5 20V10M12 20V4M19 20v-7",
  rules: "M6 4h12v16H6zM9 9h6M9 13h6",
  mark: "M5 12l4 4 10-10",
  week: "M4 6h16v14H4zM4 10h16M9 4v4M15 4v4",
  reports: "M7 3h7l4 4v14H7zM14 3v4h4",
});

export const UTIL_ICONS = Object.freeze({
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  "chevron-down": "M6 9l6 6 6-6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  check: "M5 12l4 4 10-10",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  print: "M7 8V4h10v4M7 17H4v-7h16v7h-3M7 14h10v6H7z",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  ai: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z",
  copy: "M8 8h12v12H8zM4 16V4h12",
  more: "M5 12h.01M12 12h.01M19 12h.01",
});

const NAMES = Object.freeze({
  home: "Главная", deals: "Мои сделки", numbers: "Мои цифры", rules: "Правила",
  mark: "Отметка дня", week: "Неделя", reports: "Отчёты",
  plus: "Добавить", close: "Закрыть", "chevron-down": "Раскрыть", search: "Поиск",
  info: "Информация", alert: "Ошибка", check: "Готово", download: "Скачать",
  print: "Печать", moon: "Тема", ai: "ИИ-разбор", copy: "Копировать", more: "Ещё",
});

const ALL = Object.freeze({ ...NAV_ICONS, ...UTIL_ICONS });

/** icon("home", 20) — decorative; data-icon lets the serialiser emit a Django include */
export function icon(name, size = 20, extraClass = "") {
  const path = ALL[name];
  if (!path) throw new Error(`Нет иконки «${name}»`);
  const root = svg("svg", {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round",
    "aria-hidden": "true", "data-icon": name, class: `shrink-0 ${extraClass}`.trim(),
  });
  root.append(svg("path", { d: path }));
  return root;
}

function iconTile(name) {
  return el("li", { class: "flex flex-col items-start gap-3 border-b border-r border-line p-4" },
    icon(name, 24),
    el("span", { class: "text-[13px] font-medium" }, NAMES[name]),
    el("code", { class: "num text-[12px] text-ink-2" }, name));
}

function iconGroup(title, names) {
  return el("div", { class: "mt-6 first:mt-0" },
    el("h3", { class: "text-[13px] font-medium text-ink-2" }, title),
    el("ul", { class: "mt-3 grid grid-cols-2 border-l border-t border-line sm:grid-cols-4 lg:grid-cols-6" },
      names.map(iconTile)));
}

const ICON_PARTIAL = `{# templates/ui/icon.html — one partial, every icon. Usage: {% include "ui/icon.html" with name="rules" %} #}
<svg width="{{ size|default:20 }}" height="{{ size|default:20 }}" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="1.7"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0">
  {% if name == "home" %}<path d="M4 11l8-7 8 7v9H4z"/>
  {% elif name == "rules" %}<path d="M6 4h12v16H6zM9 9h6M9 13h6"/>
  {# … остальные пути из ds/icons.js … #}
  {% endif %}
</svg>`;

export function renderIcons(container) {
  container.append(
    iconGroup("Навигация — по одной иконке на раздел", Object.keys(NAV_ICONS)),
    iconGroup("Служебные", Object.keys(UTIL_ICONS)));
  return ICON_PARTIAL;
}
