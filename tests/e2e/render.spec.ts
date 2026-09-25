import { test, expect, type Page } from "@playwright/test";
import { PRIMARY_NAV, SITE_LINKS } from "../../src/lib/site-config";

/**
 * What lint, typecheck and unit tests cannot see: how the site actually
 * renders. Every check here is a bug that shipped once.
 *
 * - `.btn-primary` lost its only definition and every page's main action
 *   rendered as bare text on production for weeks.
 * - The header's six menus wrapped onto two lines at 1440px.
 * - A table inside a grid pushed the whole phone layout sideways.
 * - The mobile menu opened to nothing: a `fixed` panel inside a header with
 *   backdrop-filter is positioned against the header, not the screen.
 */

const internal = SITE_LINKS.filter((l) => l.href.startsWith("/"));

test.describe("every page renders", () => {
  for (const link of [{ href: "/" }, ...internal]) {
    test(`${link.href} answers 200`, async ({ page }) => {
      const res = await page.goto(link.href, { waitUntil: "domcontentloaded" });
      expect(res?.status()).toBe(200);
    });
  }
});

async function background(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
}

test("the primary actions are styled", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // A class with no CSS behind it renders transparent — the #77 regression.
  expect(await background(page, ".btn-frame-accent")).not.toBe("rgba(0, 0, 0, 0)");
  await page.goto("/join", { waitUntil: "domcontentloaded" });
  const primary = page.locator(".btn-primary");
  if ((await primary.count()) > 0) {
    expect(await background(page, ".btn-primary")).not.toBe("rgba(0, 0, 0, 0)");
  }
});

test("the header fits on one line at 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const { headerHeight, navHeight } = await page.evaluate(() => ({
    headerHeight: document.querySelector("header")?.getBoundingClientRect().height ?? 0,
    navHeight: parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--public-nav-height"),
    ),
  }));
  expect(headerHeight).toBeGreaterThan(0);
  expect(headerHeight).toBeLessThanOrEqual(navHeight + 1);
  const header = page.locator("header").first();
  for (const item of PRIMARY_NAV) {
    const link = header.getByRole("link", { name: item.title, exact: true });
    const b = await link.boundingBox();
    // One line of text: a wrapped label is roughly twice as tall.
    expect(b?.height ?? 0).toBeLessThan(28);
  }
});

test.describe("phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const href of ["/", "/hire", "/security", "/governance", "/proposals", "/dashboard"]) {
    test(`${href} does not scroll sideways`, async ({ page }) => {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("the menu opens and lists the site", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const menu = page.locator("#site-menu");
    // The page may not have hydrated yet at domcontentloaded, so a first click
    // can land on inert HTML. Click only while the menu is still closed.
    await expect(async () => {
      if (!(await menu.isVisible())) await page.getByRole("button", { name: "Open menu" }).click();
      await expect(menu).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    const box = await menu.boundingBox();
    // It must cover the screen below the header, not collapse inside it.
    expect(box?.height ?? 0).toBeGreaterThan(400);
    await expect(menu.getByRole("link", { name: "Hire Solon" }).first()).toBeVisible();
    await expect(menu.getByRole("link", { name: "Security" })).toBeVisible();
  });
});
