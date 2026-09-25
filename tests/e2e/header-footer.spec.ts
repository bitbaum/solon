import { test, expect } from "@playwright/test";
import { MENU, SITE_SECTIONS } from "../../src/lib/site-config";
import en from "../../messages/en.json";

test.describe("Header & Footer", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("each panel opens its sheet with every page in it; the footer lists the site", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const nav = page.getByRole("navigation", { name: en.Nav.main });
    await expect(nav.getByRole("link", { name: en.Nav.hire })).toBeVisible();

    for (const section of MENU) {
      const trigger = nav.getByRole("button", { name: en.Site.sections[section.key] });
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      const panel = page.locator(`#panel-${section.key}`);
      await expect(panel).toBeVisible();
      for (const link of section.children) {
        await expect(
          panel.getByRole("link", { name: new RegExp(`^${en.Site.links[link.key]}`) }).first(),
        ).toBeVisible();
      }
      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);
    }

    const footer = page.locator("footer");
    for (const section of SITE_SECTIONS) {
      await expect(
        footer.getByText(en.Site.sections[section.key], { exact: true }).first(),
      ).toBeVisible();
    }
  });

  test("a link in a panel navigates and closes the panel", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const nav = page.getByRole("navigation", { name: en.Nav.main });
    await nav.getByRole("button", { name: en.Site.sections.useCases }).click();
    await page
      .locator("#panel-useCases")
      .getByRole("link", { name: new RegExp(`^${en.Site.links.forNetworkStates}`) })
      .first()
      .click();
    await expect(page).toHaveURL(/\/for\/network-states$/);
    await expect(page.locator("#panel-useCases")).toHaveCount(0);
  });
});
