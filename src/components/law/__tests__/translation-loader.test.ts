/**
 * A law page asks for a translation only when its reader taps.
 *
 * It used to ask on every view, so anything that ran the page's script spent
 * the free AI day every app on the server shares (14 Nov 2026: Solon's law
 * translation, before anyone was awake).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import TranslationLoader from "../translation-loader";

const labels = { translate: "Translate this page", translating: "Translating…", failed: "Failed" };

describe("TranslationLoader", () => {
  it("draws a button and asks nothing on its own", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const html = renderToStaticMarkup(
      createElement(TranslationLoader, { act: "a", page: 1, to: "en", labels }),
    );
    expect(html).toContain('<button type="button"');
    expect(html).toContain("Translate this page");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("has no effect that could fire before a tap", () => {
    const source = readFileSync(join(__dirname, "../translation-loader.tsx"), "utf8");
    expect(source).not.toMatch(/useEffect/);
  });

  it.each(["en", "de", "fr", "it", "ru"])("the button's words exist in %s", (locale) => {
    const m = JSON.parse(readFileSync(join(process.cwd(), `messages/${locale}.json`), "utf8"));
    const act = (function find(o: Record<string, unknown>): Record<string, unknown> | null {
      if (o && typeof o === "object" && "translating" in o && "translationFailed" in o) return o;
      for (const v of Object.values(o ?? {}))
        if (v && typeof v === "object") {
          const hit = find(v as Record<string, unknown>);
          if (hit) return hit;
        }
      return null;
    })(m);
    expect(typeof act?.translate).toBe("string");
  });
});
