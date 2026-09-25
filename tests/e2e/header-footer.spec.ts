import { test, expect } from "@playwright/test";
import { PRIMARY_NAV, SITE_SECTIONS } from "../../src/lib/site-config";

test.describe("Header & Footer", () => {
  test("header carries the primary links and one call to action; footer lists the site", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav).toBeVisible();
    for (const item of PRIMARY_NAV) {
      await expect(nav.getByRole("link", { name: item.title, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Hire Solon" })).toBeVisible();

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    for (const section of SITE_SECTIONS) {
      await expect(footer.getByText(section.title, { exact: true }).first()).toBeVisible();
    }
  });
});
