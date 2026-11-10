import { test, expect } from "@playwright/test";

/**
 * A world slug of a country Solon holds places for answers 308 to the pack's
 * path, at every depth: two addresses for one place showed two contradicting
 * pages. The redirect is made in the proxy from the configuration, so it needs
 * no database and runs against CI's server as well as the live site.
 */
const CASES: [from: string, to: string][] = [
  ["/places/united-states", "/places/united_states"],
  ["/places/united-states/wyoming", "/places/united_states/wyoming"],
  ["/places/united-states/wyoming/albany-county", "/places/united_states/wyoming/albany-county"],
  ["/places/south-ossetia", "/places/south_ossetia"],
  ["/de/places/united-states/wyoming", "/de/places/united_states/wyoming"],
];

for (const [from, to] of CASES) {
  test(`${from} answers 308 to ${to}`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(new URL(response.headers()["location"]!).pathname).toBe(to);
  });
}

test("a query string survives the redirect", async ({ request }) => {
  const response = await request.get("/places/united-states?x=1", { maxRedirects: 0 });
  expect(new URL(response.headers()["location"]!).search).toBe("?x=1");
});
