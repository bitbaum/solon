import { test, expect } from "@playwright/test";

test("landing shows Solon hero and pillars", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").getByText("SOLON")).toBeVisible();
  await expect(
    page.locator("h1 + p").getByText("Bitcoin-Native Governance for the Digital Age"),
  ).toBeVisible();
  await expect(page.locator("h3").getByText("Transparent Transaction System")).toBeVisible();
  await expect(page.locator("h3").getByText("Open Vote System")).toBeVisible();
});
