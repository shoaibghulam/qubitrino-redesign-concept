/* Page chrome: theme toggle, mobile menu disclosure, access form. */
import { byId } from "./dom.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function currentTheme(root) {
  if (root.dataset.theme) return root.dataset.theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function initThemeToggle() {
  const root = document.documentElement;
  const toggle = byId("theme-toggle");
  toggle.setAttribute("aria-pressed", String(currentTheme(root) === "dark"));
  toggle.addEventListener("click", () => {
    const next = currentTheme(root) === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    toggle.setAttribute("aria-pressed", String(next === "dark"));
    try { localStorage.setItem("q-theme", next); } catch (e) { /* storage blocked — theme lasts this visit only */ }
  });
}

export function initMobileMenu() {
  const button = byId("menu-button");
  const menu = byId("mobile-menu");
  const setOpen = (open) => {
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Закрыть меню" : "Меню");
    menu.hidden = !open;
  };
  button.addEventListener("click", () => setOpen(menu.hidden));
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || menu.hidden) return;
    setOpen(false);
    button.focus();
  });
}

export function initAccessForm() {
  const form = byId("access-form");
  const input = byId("access-email");
  const status = byId("access-status");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    const valid = EMAIL_RE.test(value);
    input.setAttribute("aria-invalid", String(!valid));
    status.classList.toggle("text-loss", !valid);
    status.textContent = valid
      ? `Готово: напишем на ${value}, когда включим доступ. (В концепте заявка не отправляется.)`
      : "Проверьте адрес: в нём должны быть «@» и домен, например name@example.ru.";
    if (!valid) input.focus();
  });
}
