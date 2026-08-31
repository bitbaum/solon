import { test, expect } from "@playwright/test";

test.describe("Header & Footer", () => {
  test("header renders logo, nav, and CTAs, footer renders columns", async ({ page }) => {
    await page.goto("/");

    // Header
    await expect(page.getByRole("navigation", { name: "Main Navigation" })).toBeVisible();
    await expect(page.getByText("SOLON").first()).toBeVisible();
    // At least one top-level menu button is visible
    await expect(page.getByRole("button", { name: "Platform" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Dashboard" })).toBeVisible();

    // Footer
    // Pick the white footer (site footer), not any dark section footer
    const siteFooter = page.locator("footer.mt-16");
    await expect(siteFooter).toBeVisible();
    await expect(siteFooter.locator('div:text-is("Platform")')).toBeVisible();
    await expect(siteFooter.locator('div:text-is("Governance")')).toBeVisible();
    await expect(siteFooter.locator('div:text-is("Ecosystem")')).toBeVisible();
    await expect(siteFooter.locator('div:text-is("Resources")')).toBeVisible();
  });
});
