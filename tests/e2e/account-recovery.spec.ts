import { test, expect } from "@playwright/test";
import { authLabelsFor } from "@bitbaum/accountkit/auth";
import en from "../../messages/en.json";
import de from "../../messages/de.json";

/**
 * Password recovery while this deployment sends no email — the state CI's
 * server runs in (no RESEND_API_KEY). The screen must promise nothing that
 * cannot arrive (no "Forgot your password?", no sign-in link) and must still
 * show someone who lost their password a way forward (no dead ends).
 *
 * The other state, with mail configured, is the shared account journey
 * (.github/workflows/browser-smoke.yml): reset by email, sign-in by link.
 */
for (const [href, locale, messages] of [
  ["/sign-in", "en", en],
  ["/de/sign-in", "de", de],
] as const) {
  const labels = authLabelsFor(locale);
  test(`${href} without account mail offers no reset and shows the way back`, async ({ page }) => {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const main = page.locator("main");
    await expect(main.locator("#acct-password")).toBeVisible();

    await expect(main.getByRole("button", { name: labels.recovery!.forgot })).toHaveCount(0);
    await expect(main.getByRole("button", { name: labels.withLink })).toHaveCount(0);

    const help = main.getByTestId("lost-password");
    await expect(help.getByRole("heading", { name: messages.LostPassword.title })).toBeVisible();
    await expect(help).toContainText(messages.LostPassword.passkey);
    await expect(help.locator('a[href^="mailto:"]')).toBeVisible();
  });
}
