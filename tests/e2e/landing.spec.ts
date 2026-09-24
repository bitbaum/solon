import { test, expect } from "@playwright/test";

test("landing shows Solon hero and pillars", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator("h1").getByText("Governance any group can run, in the open"),
  ).toBeVisible();
  await expect(page.locator("h3").getByText("Transparent Treasury")).toBeVisible();
  await expect(page.locator("h3").getByText("Democratic Voting")).toBeVisible();
});
