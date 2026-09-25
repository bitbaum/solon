import { test, expect } from "@playwright/test";

test("landing states what Solon is and offers the way in", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Decide together.");
  await expect(page.getByRole("heading", { name: "Three steps. Nothing hidden." })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Any group that decides together." }),
  ).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Hire Solon" })).toBeVisible();
});
