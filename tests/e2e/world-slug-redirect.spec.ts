import { test, expect } from "@playwright/test";

/**
 * The hyphenated root is a place's canonical path (`place_paths`), so it must
 * never answer 308 to the underscored form: that was a loop on the live site
 * once the page began redirecting the underscored form to the hyphenated one.
 * Runs against CI's server as well as the live site, with or without data.
 */
const PATHS = [
  "/places/united-states",
  "/places/united-states/wyoming",
  "/places/south-ossetia",
  "/de/places/united-states/wyoming",
];

for (const path of PATHS) {
  test(`${path} is never sent to an underscored path`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    const location = response.headers()["location"] ?? "";
    expect(location, `${response.status()}`).not.toMatch(/\/places\/(united|south)_/);
  });
}
