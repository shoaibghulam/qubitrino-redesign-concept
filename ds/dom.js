/*
  DOM helpers for the design-system page.
  Every node is built with createElement; snippets are produced by serialising
  the very node that is rendered live, so code and demo can never drift apart.
*/
const SVG_NS = "http://www.w3.org/2000/svg";
const VOID_TAGS = new Set(["input", "br", "img", "hr", "meta", "link"]);
const INLINE_LIMIT = 96;

/** el("p", { class: "x" }, "text", child) — attributes with null/false are skipped */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  setAttrs(node, attrs);
  children.flat().forEach((child) => {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  });
  return node;
}

export function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  setAttrs(node, attrs);
  return node;
}

function setAttrs(node, attrs) {
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    node.setAttribute(key, value === true ? "" : String(value));
  });
}

/* ---------- Serialiser: DOM node → readable Django/HTML markup ---------- */

function attrString(node) {
  return [...node.attributes]
    .filter((a) => !a.name.startsWith("data-ds"))
    .map((a) => (a.value === "" ? ` ${a.name}` : ` ${a.name}="${a.value.replace(/"/g, "&quot;")}"`))
    .join("");
}

function textOf(node) {
  return node.textContent.replace(/ /g, "&nbsp;").replace(/\s+/g, " ").trim();
}

function serializeNode(node, depth) {
  const pad = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = textOf(node);
    return text ? `${pad}${text}` : "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  if (node.dataset && node.dataset.icon) {
    return `${pad}{% include "ui/icon.html" with name="${node.dataset.icon}" %}`;
  }
  const tag = node.localName;
  const open = `<${tag}${attrString(node)}>`;
  if (VOID_TAGS.has(tag)) return `${pad}${open}`;
  const kids = [...node.childNodes];
  const onlyText = kids.every((k) => k.nodeType === Node.TEXT_NODE);
  const inline = `${open}${textOf(node)}</${tag}>`;
  if (onlyText && inline.length + pad.length <= INLINE_LIMIT) return `${pad}${inline}`;
  if (onlyText) return `${pad}${open}\n${pad}  ${textOf(node)}\n${pad}</${tag}>`;
  const body = kids.map((k) => serializeNode(k, depth + 1)).filter(Boolean).join("\n");
  return `${pad}${open}\n${body}\n${pad}</${tag}>`;
}

export function serialize(...nodes) {
  return nodes.map((n) => serializeNode(n, 0)).join("\n");
}

/* ---------- Code block with copy ---------- */

const STATUS_MS = 2400;
/** One reset timer per status node: a second click restarts it instead of stacking timers. */
const statusTimers = new WeakMap();

async function copyText(text, status) {
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "Скопировано";
  } catch (error) {
    status.textContent = "Не удалось — выделите код вручную";
  }
  clearTimeout(statusTimers.get(status));
  statusTimers.set(status, setTimeout(() => { status.textContent = ""; }, STATUS_MS));
}

/** A <pre><code> block whose text is set with textContent — never parsed as HTML */
export function codeBlock(text, { label = "HTML", open = false, summary = "Код" } = {}) {
  const code = el("code", { class: "num block whitespace-pre-wrap break-words text-[12.5px] leading-[1.65]" });
  code.textContent = text;
  const status = el("span", { class: "text-[12px] text-ink-2", role: "status" });
  const copy = el("button", {
    type: "button",
    class: "inline-flex h-10 items-center rounded-sm px-3 text-[13px] font-medium text-ink-2 hover:bg-sunken hover:text-ink transition-colors",
  }, "Копировать");
  copy.addEventListener("click", () => copyText(text, status));

  const head = el("div", { class: "flex flex-wrap items-center justify-between gap-x-3 border-b border-line pl-4 pr-1" },
    el("span", { class: "min-w-0 break-words py-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-2" }, label),
    el("span", { class: "ml-auto flex min-w-0 items-center gap-2" }, status, copy));
  const body = el("div", { class: "rounded-sm border border-line bg-sunken/60" },
    head, el("pre", { class: "relative max-h-[420px] overflow-auto p-4", tabindex: "0", "aria-label": `Код: ${label}` }, code));

  if (summary === null) return body;
  const details = el("details", { class: "group mt-4", ...(open ? { open: true } : {}) },
    el("summary", { class: "inline-flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm text-[13px] font-medium text-ink-2 hover:text-ink" },
      el("span", { class: "num inline-block transition-transform group-open:rotate-90", "aria-hidden": "true" }, "›"), summary),
    el("div", { class: "mt-2" }, body));
  return details;
}

/* ---------- Component article ---------- */

/**
 * spec: { id, title, lede, demo: Node, snippet: string, notes: string[], open, stage }
 * stage "plain" drops the framed canvas for full-bleed demos (tables, phone frames).
 */
export function componentBlock(spec) {
  const { id, title, lede, demo, snippet, notes = [], open = false, stage = "frame" } = spec;
  const stageCls = stage === "plain"
    ? "mt-5"
    : "mt-5 rounded-md border border-line bg-surface p-5 sm:p-7";
  const noteList = notes.length
    ? el("ul", { class: "mt-4 space-y-1 text-[13px] leading-relaxed text-ink-2" },
      notes.map((n) => el("li", { class: "flex gap-2" }, el("span", { class: "text-ink-3", "aria-hidden": "true" }, "—"), n)))
    : null;
  return el("article", { id, class: "ds-cmp scroll-mt-24 border-t border-line pt-8 first:border-0 first:pt-0", "aria-labelledby": `${id}-h` },
    el("h3", { id: `${id}-h`, class: "text-[17px] font-semibold tracking-tight" }, title),
    lede ? el("p", { class: "mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-2" }, lede) : null,
    el("div", { class: stageCls }, demo),
    noteList,
    snippet ? codeBlock(snippet, { open, label: "Django-шаблон · Tailwind" }) : null);
}

/** Small uppercase label used across the page */
export function microLabel(text, extra = "") {
  return el("p", { class: `text-[11px] font-medium uppercase tracking-[0.08em] text-ink-2 ${extra}` }, text);
}

export function renderError(container, message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  container.append(el("p", { class: "rounded-sm border border-loss/50 px-4 py-3 text-[14px] text-loss", role: "alert" },
    `${message}: ${detail}`));
}
