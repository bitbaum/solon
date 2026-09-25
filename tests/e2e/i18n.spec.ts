import { test, expect } from "@playwright/test";
import { locales } from "../../src/i18n/routing";
import en from "../../messages/en.json";
import de from "../../messages/de.json";
import fr from "../../messages/fr.json";
import it_ from "../../messages/it.json";
import ru from "../../messages/ru.json";

const HERO: Record<string, string> = {
  en: en.Home.hero.line1,
  de: de.Home.hero.line1,
  fr: fr.Home.hero.line1,
  it: it_.Home.hero.line1,
  ru: ru.Home.hero.line1,
};

const prefix = (l: string) => (l === "en" ? "" : `/${l}`);

test.describe("languages", () => {
  for (const locale of locales) {
    test(`${locale}: the front page speaks it`, async ({ page }) => {
      await page.goto(`${prefix(locale)}/`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toContainText(HERO[locale]);
    });
  }

  test("the switcher keeps you on the same page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // This one test needs a hydrated page: a selection made before React attaches
    // its handler changes the DOM and navigates nowhere. networkidle is the
    // plainest signal that the scripts have loaded and run.
    await page.goto("/hire", { waitUntil: "networkidle" });
    await page.getByRole("combobox", { name: en.Nav.language }).selectOption("de");
    await expect(page).toHaveURL(/\/de\/hire$/, { timeout: 15_000 });
    await expect(page.locator("h1")).toContainText(de.Hire.hero.title);
  });

  test("an untranslated page says so in the reader's language", async ({ page }) => {
    await page.goto("/de/governance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(de.Notice.untranslated)).toBeVisible();
  });

  test("a translated page shows no notice", async ({ page }) => {
    await page.goto("/de/hire", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(de.Notice.untranslated)).toHaveCount(0);
  });

  test("API routes stay outside languages", async ({ request }) => {
    expect((await request.get("/api/health")).status()).toBe(200);
    expect((await request.get("/de/api/health")).status()).toBe(404);
  });
});
