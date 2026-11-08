/**
 * The head script and the module must agree: the script paints the first
 * frame, the module everything after. If they disagreed, the theme would
 * change under the reader as the page hydrated.
 */
import { describe, expect, it } from "vitest";
import {
  DARK_CLASS,
  isThemeChoice,
  resolveTheme,
  THEME_CHOICES,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "../theme";

/** Run the inline script against a stand-in page; return what it drew. */
function runScript(stored: string | null, deviceDark: boolean, storageThrows = false) {
  const classes = new Set<string>();
  const attrs: Record<string, string> = {};
  const style: Record<string, string> = {};
  const documentElement = {
    classList: {
      toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
    },
    setAttribute: (k: string, v: string) => (attrs[k] = v),
    style,
  };
  const localStorage = {
    getItem: (key: string) => {
      if (storageThrows) throw new Error("blocked");
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  const window = { matchMedia: () => ({ matches: deviceDark }) };
  new Function("localStorage", "window", "document", THEME_SCRIPT)(localStorage, window, {
    documentElement,
  });
  return { dark: classes.has(DARK_CLASS), theme: attrs["data-theme"], scheme: style.colorScheme };
}

describe("theme", () => {
  it("knows its three choices and nothing else", () => {
    for (const c of THEME_CHOICES) expect(isThemeChoice(c)).toBe(true);
    expect(isThemeChoice("sepia")).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
  });

  for (const stored of [null, "light", "dark", "system", "nonsense"]) {
    for (const deviceDark of [false, true]) {
      it(`the head script draws what the module would (stored ${stored}, device ${deviceDark ? "dark" : "light"})`, () => {
        const choice: ThemeChoice = isThemeChoice(stored) ? stored : "system";
        const want = resolveTheme(choice, deviceDark);
        expect(runScript(stored, deviceDark)).toEqual({
          dark: want === "dark",
          theme: want,
          scheme: want,
        });
      });
    }
  }

  it("follows the device when storage is blocked, rather than throwing", () => {
    expect(runScript(null, true, true).dark).toBe(true);
    expect(runScript(null, false, true).dark).toBe(false);
  });
});
