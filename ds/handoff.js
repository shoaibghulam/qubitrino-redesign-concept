/*
  Handoff: the exact Tailwind config, the Django rule-badge partial, and the
  naming table. Code is plain text, inserted with textContent.
*/
import { codeBlock, el } from "./dom.js";

export const TAILWIND_CONFIG = `<!-- base.html, в <head>: токены → Tailwind. Порядок важен. -->
<link rel="stylesheet" href="{% static 'css/tokens.css' %}">
<script src="https://cdn.tailwindcss.com/3.4.16"></script>
<script>
  const token = (n) => \`rgb(var(--c-\${n}) / <alpha-value>)\`;
  tailwind.config = { theme: { extend: {
    colors: { paper: token("paper"), surface: token("surface"), sunken: token("sunken"), line: token("line"),
      ink: token("ink"), "ink-2": token("ink-2"), "ink-3": token("ink-3"), action: token("action"),
      "on-action": token("on-action"), gain: token("gain"), loss: token("loss"), kept: token("kept"),
      broken: token("broken"), ai: token("ai") },
    fontFamily: { ui: ["Onest","system-ui","sans-serif"], num: ["JetBrains Mono","monospace"] },
    borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)" } } } };
</script>`;

const DJANGO_INCLUDE = `{# templates/cabinet/day_row.html #}
<td class="px-4 py-2.5">
  {% for rule in day.rules %}
    {% include "ui/rule_badge.html" with rule=rule %}
  {% empty %}
    <span class="text-ink-2">соблюдены</span>
  {% endfor %}
</td>`;

const DJANGO_PARTIAL = `{# templates/ui/rule_badge.html
   rule.short_label — «> 10 сделок»; rule.is_broken — bool.
   Поведение, не деньги: никаких text-gain / text-loss внутри. #}
{% if rule.is_broken %}
<span class="inline-flex items-center gap-1.5 rounded-sm border border-broken/60 px-2 py-0.5 text-[12px] text-ink">
  <span class="hatch inline-block h-2 w-2 rounded-full" aria-hidden="true"></span>
  {{ rule.short_label }}<span class="sr-only"> — нарушено</span>
</span>
{% else %}
<span class="inline-flex items-center gap-1.5 rounded-sm border border-line px-2 py-0.5 text-[12px] text-ink-2">
  <span class="inline-block h-2 w-2 rounded-full bg-kept" aria-hidden="true"></span>
  {{ rule.short_label }}
</span>
{% endif %}`;

const NAMING = Object.freeze([
  ["Цвет", "--c-loss", "text-loss · bg-loss/10", "По роли, не по оттенку: нет red/blue/green в коде."],
  ["Прозрачность", "rgb(var(--c-ink) / .6)", "bg-action/90", "Каналы RGB — поэтому /alpha работает и в CSS, и в Tailwind."],
  ["Числа", ".num", "class=\"num\"", "Любое число в интерфейсе. Без исключений, даже «138»."],
  ["Нарушение", ".hatch", "class=\"hatch\"", "Всегда вместе с broken, не вместо него."],
  ["Радиус", "--radius-sm / -md", "rounded-sm · rounded-md", "6 — контрол, 10 — панель. Других нет."],
  ["Партиалы", "templates/ui/*.html", "{% include \"ui/…\" %}", "Один компонент — один файл, данные через with."],
]);

function namingTable() {
  return el("div", { class: "overflow-x-auto rounded-md border border-line bg-surface", role: "region", tabindex: "0", "aria-label": "Соглашения об именах" },
    el("table", { class: "w-full min-w-[680px] text-left text-[13px]" },
      el("caption", { class: "sr-only" }, "Соглашения об именах: CSS, Tailwind, правило"),
      el("thead", { class: "text-[11px] uppercase tracking-[0.08em] text-ink-2" },
        el("tr", { class: "border-b border-line" },
          ["Что", "tokens.css", "Tailwind / шаблон", "Правило"].map((h) => el("th", { scope: "col", class: "px-4 py-3 font-medium" }, h)))),
      el("tbody", {}, NAMING.map(([what, css, tw, rule]) => el("tr", { class: "border-b border-line last:border-0 align-top" },
        el("th", { scope: "row", class: "px-4 py-3 font-medium" }, what),
        el("td", { class: "px-4 py-3" }, el("code", { class: "num text-[12px]" }, css)),
        el("td", { class: "px-4 py-3" }, el("code", { class: "num text-[12px]" }, tw)),
        el("td", { class: "px-4 py-3 text-ink-2" }, rule))))));
}

export function renderHandoff({ configEl, namingEl, djangoEl, iconPartial }) {
  configEl.append(codeBlock(TAILWIND_CONFIG, { label: "base.html", summary: null }));
  namingEl.append(namingTable());
  djangoEl.append(
    codeBlock(DJANGO_INCLUDE, { label: "Вызов", summary: null }),
    el("div", { class: "mt-4" }, codeBlock(DJANGO_PARTIAL, { label: "templates/ui/rule_badge.html", summary: null })),
    codeBlock(iconPartial, { label: "templates/ui/icon.html", summary: "Партиал иконок" }));
}
