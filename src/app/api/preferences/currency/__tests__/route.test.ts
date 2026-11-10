import { describe, expect, it } from "vitest";
import { CURRENCY_COOKIE } from "@/lib/config/money";
import { GET } from "../route";

const ask = (query: string) =>
  GET(new Request(`https://solon.example/api/preferences/currency?${query}`));

describe("choosing a currency", () => {
  it("remembers an offered currency for a year and goes back to the page", () => {
    const res = ask("c=EUR&next=%2Fde%2Fbudgets%2Fgermany%3Fyear%3D2023");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://solon.example/de/budgets/germany?year=2023");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${CURRENCY_COOKIE}=EUR`);
    expect(cookie).toMatch(/Max-Age=31536000/);
  });

  it("keeps nothing it does not offer, and never sends the reader off the site", () => {
    const res = ask("c=XYZ&next=%2F%2Fevil.example");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("location")).toBe("https://solon.example/");
    expect(ask("c=USD&next=https%3A%2F%2Fevil.example").headers.get("location")).toBe(
      "https://solon.example/",
    );
  });
});
