import { test, expect } from "@playwright/test";
import { PRIMARY_NAV, SITE_SECTIONS } from "../../src/lib/site-config";
import en from "../../messages/en.json";

test.describe("Header & Footer", () => {
  test("header carries the primary links and one call to action; footer lists the site", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav).toBeVisible();
    for (const item of PRIMARY_NAV) {
      await expect(
        nav.getByRole("link", { name: en.Site.links[item.key], exact: true }),
      ).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Hire Solon" })).toBeVisible();

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    for (const section of SITE_SECTIONS) {
      await expect(
        footer.getByText(en.Site.sections[section.key], { exact: true }).first(),
      ).toBeVisible();
    }
  });
});
