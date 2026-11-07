/* Landing entry point. */
import { initThemeToggle, initMobileMenu, initAccessForm } from "./chrome.js";
import { renderHero } from "./hero.js";
import { renderFeatures } from "./features.js";
import { renderStory } from "./story.js";

initThemeToggle();
initMobileMenu();
initAccessForm();
renderHero();
renderFeatures();
renderStory();
