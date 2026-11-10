import { test, expect } from "@playwright/test";
import en from "../../messages/en.json";

/**
 * Every place has a page and every page leads on (design:
 * docs/design/2026-11-place-navigation.md, "Acceptance: QA 2026-11-10"). From a
 * country, open the first place inside it, then the first inside that, down to
 * a place with none inside it; at each step the page is a page, it names the
 * place, and its breadcrumb leads back to the one above. It names no country
 * in its steps: the start is `PLACE_ROOT` (a path below /places), Liechtenstein
 * by default, so the same check runs against the live site with `BASE_URL`.
 * Skips when the database holds no such place (CI's holds only Testland).
 */
const ROOT = process.env.PLACE_ROOT ?? "liechtenstein";
const MAX_DEPTH = 8;

test("every level opens, names itself and leads back up", async ({ page }) => {
  const start = await page.goto(`/places/${ROOT}`, { waitUntil: "domcontentloaded" });
  test.skip(!start || start.status() === 404, `the database holds no place at /places/${ROOT}`);

  let path = `/places/${ROOT}`;
  let depth = 0;
  for (; depth < MAX_DEPTH; depth++) {
    const children = page.locator("section[aria-labelledby='place-parts'] a[href^='/places/']");
    if ((await children.count()) === 0) break;
    const next = (await children.first().getAttribute("href"))!;
    const response = await page.goto(next, { waitUntil: "domcontentloaded" });
    expect(response?.status(), next).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }), next).not.toHaveText("");
    const trail = page.getByRole("navigation", { name: en.Places.partOf });
    await expect(trail.locator(`a[href='${path}']`), `${next} links back to ${path}`).toHaveCount(
      1,
    );
    path = next;
  }
  expect(depth, `no place inside ${ROOT} to open`).toBeGreaterThan(0);
  expect(depth, "the drill never reached a place with nothing inside it").toBeLessThan(MAX_DEPTH);
});
