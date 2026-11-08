/**
 * Light, dark, or whatever the device says — the reader's choice, kept in
 * their own browser.
 *
 * `@bitbaum/design-tokens` already ships both themes: `:root` is light and
 * `.dark` overrides it. This module only decides which one is on, so it holds
 * no colour and names nothing of Solon's. It is written to move into the token
 * package unchanged (ROADMAP.md {#theme-package}): no framework import here,
 * the React parts in this folder import from it, never the other way round.
 *
 * The choice lives in localStorage, not a cookie: the server never needs it,
 * so the pages stay static and there is no round trip. The price is that the
 * server cannot know the theme, so the inline script below sets it before the
 * first paint, and `<html>` carries `suppressHydrationWarning` for the class
 * and attributes that script adds.
 *
 * Two marks go on `<html>`: the `dark` class the tokens key on, and
 * `data-theme`, the attribute bip-kit and the fleet's other packages read
 * (with neither, they follow the device on their own and could disagree with
 * the page).
 */

export const THEME_CHOICES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type Theme = Exclude<ThemeChoice, "system">;

/** The localStorage key. Per origin, so every app on its own host has its own. */
export const THEME_STORAGE_KEY = "theme";
/** The class `@bitbaum/design-tokens` switches its dark values on. */
export const DARK_CLASS = "dark";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}

/** What is drawn for a choice: "system" defers to the device. */
export function resolveTheme(choice: ThemeChoice, deviceDark: boolean): Theme {
  if (choice === "system") return deviceDark ? "dark" : "light";
  return choice;
}

/** The stored choice; anything unreadable or unknown is "system". */
export function readThemeChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system"; // storage blocked (private mode, a sandboxed frame)
  }
}

/** Put a theme on the page: the class, the attribute, and the form controls' colour scheme. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.classList.toggle(DARK_CLASS, theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

const deviceDark = () => window.matchMedia(DARK_QUERY).matches;

/** Store a choice and draw it now. "system" removes the stored value rather than storing it. */
export function setThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Not stored, still drawn: the choice lasts until the page is left.
  }
  applyTheme(resolveTheme(choice, deviceDark()));
  for (const listener of listeners) listener();
}

const listeners = new Set<() => void>();

/**
 * Follow the choice and the device: `onChange` runs when either changes,
 * including from another tab. While the choice is "system" the page is
 * redrawn when the device switches (an OS that goes dark at sunset).
 */
export function subscribeTheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  const onDevice = () => {
    const choice = readThemeChoice();
    if (choice === "system") applyTheme(resolveTheme(choice, media.matches));
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== THEME_STORAGE_KEY) return;
    applyTheme(resolveTheme(readThemeChoice(), media.matches));
    onChange();
  };
  listeners.add(onChange);
  media.addEventListener("change", onDevice);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onDevice);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The script that runs in `<head>` before anything is painted. A string, not
 * a function's source, so a minifier cannot rename what it relies on; the
 * test runs it against the same rules as `resolveTheme`. A blocked
 * localStorage reads as "system", as `readThemeChoice` does.
 */
export const THEME_SCRIPT =
  `(function(){var c=null;` +
  `try{c=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){}` +
  `try{` +
  `var d=c==="dark"||(c!=="light"&&window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches);` +
  `var r=document.documentElement;` +
  `r.classList.toggle(${JSON.stringify(DARK_CLASS)},d);` +
  `r.setAttribute("data-theme",d?"dark":"light");` +
  `r.style.colorScheme=d?"dark":"light";` +
  `}catch(e){}})();`;
