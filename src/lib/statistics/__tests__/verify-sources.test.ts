import { describe, expect, it } from "vitest";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { curatedRecordSchema, type CuratedRecord } from "../records";
import { collectEvidence, comparable, missingWords, verifyEvidence } from "../verify-sources";

const evidence = (url: string, expectWords: string[], extra: object = {}) => ({
  publisher: "P",
  url,
  read: "2026-11-09",
  expect: expectWords,
  ...extra,
});
const link = (key: string, ev: object[]): CuratedRecord =>
  curatedRecordSchema.parse({
    key,
    kind: "law_link",
    metric: "tax.income.top_rate",
    body: {
      place: null,
      act: { authority: "ch", scheme: "systematic_number", value: "642.11" },
      provision: null,
      why: { en: "w" },
      evidence: ev,
    },
  });

describe("comparing a page with the words a record expects of it", () => {
  it("reads HTML as its text and ignores whitespace, case and entities", () => {
    const html =
      "<html><head><style>p{}</style></head><body><p>The  vote was&nbsp;58&#32;to <b>33</b>.</p><script>x=1</script></body></html>";
    expect(missingWords(html, ["the vote was 58 to 33", "x=1"], "text/html")).toEqual(["x=1"]);
    expect(comparable("A&amp;B", "text/html")).toBe("a&b");
  });

  it("leaves data formats as they are, so a field and its value can be expected", () => {
    const json = '{"inFavor": 58, "against": 33}';
    expect(missingWords(json, ['"inFavor":58', '"against":34'], "application/json")).toEqual([
      '"against":34',
    ]);
    expect(missingWords("<a>1</a><b>2</b>", ["<a>1</a><b>2</b>"], "text/xml")).toEqual([]);
  });
});

describe("collecting what the records rest on", () => {
  it("lists each page once, with every expectation and every record that cites it", () => {
    const items = collectEvidence([
      link("law_link:a", [evidence("https://example.org/p", ["one"])]),
      link("law_link:b", [
        evidence("https://example.org/p", ["two", "one"]),
        evidence("https://example.org/q", []),
      ]),
    ]);
    expect(items.map((i) => i.url)).toEqual(["https://example.org/p", "https://example.org/q"]);
    expect(items[0]).toMatchObject({
      expect: ["one", "two"],
      citedBy: ["law_link:a", "law_link:b"],
    });
  });

  it("skips a page only when every citation of it says a program cannot read it", () => {
    const items = collectEvidence([
      link("law_link:a", [evidence("https://example.org/spa", [], { unchecked: true })]),
      link("law_link:b", [evidence("https://example.org/spa", ["x"])]),
      link("law_link:c", [evidence("https://example.org/only-people", [], { unchecked: true })]),
    ]);
    expect(items.find((i) => i.url.endsWith("/spa"))!.unchecked).toBe(false);
    expect(items.find((i) => i.url.endsWith("/only-people"))!.unchecked).toBe(true);
  });
});

describe("verifying the pages", () => {
  const item = (url: string, words: string[], unchecked = false) => ({
    url,
    publisher: "P",
    expect: words,
    citedBy: ["law_link:a"],
    unchecked,
  });
  const respond = (body: string, status = 200, type = "text/html") =>
    new Response(body, { status, headers: { "content-type": type } });

  it("passes a page that holds its words, fails one that lost them or is gone, and never fetches a skipped one", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: string | URL) => {
      seen.push(String(url));
      if (String(url).includes("/ok")) return respond("<p>58 for, 33 against</p>");
      if (String(url).includes("/changed")) return respond("<p>59 for</p>");
      return respond("nope", 404);
    }) as typeof fetch;
    const results = await verifyEvidence(
      [
        item("https://example.org/ok#frag", ["58 for"]),
        item("https://example.org/changed", ["58 for"]),
        item("https://example.org/gone", ["58 for"]),
        item("https://example.org/people", [], true),
      ],
      { fetchImpl, paceMs: 0, retryMs: 1 },
    );
    expect(results.map((r) => [r.ok, r.status, r.skipped ?? false])).toEqual([
      [true, 200, false],
      [false, 200, false],
      [false, 404, false],
      [true, 0, true],
    ]);
    expect(results[1]!.missing).toEqual(["58 for"]);
    expect(seen).not.toContain("https://example.org/people");
    expect(seen[0]).toBe("https://example.org/ok");
  });

  it("asks again, politely, when a publisher says too many requests or is briefly down", async () => {
    const codes = [429, 503, 200];
    let calls = 0;
    const fetchImpl = (async () => respond("58 for", codes[calls++] ?? 200)) as typeof fetch;
    const [r] = await verifyEvidence([item("https://example.org/busy", ["58 for"])], {
      fetchImpl,
      paceMs: 0,
      retryMs: 1,
    });
    expect(r!.ok).toBe(true);
    expect(calls).toBe(3);
  });
});

describe("every line of the curated records can be checked", () => {
  it("names the words it relies on, or says a program cannot read the page", () => {
    const unchecked: string[] = [];
    for (const item of collectEvidence(STATISTIC_RECORDS)) {
      if (!item.unchecked && item.expect.length === 0) unchecked.push(item.url);
    }
    expect(
      unchecked,
      "evidence lines that rest on a page without saying what it must contain",
    ).toEqual([]);
  });

  it("cites only https pages read on a day, never one in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const item of collectEvidence(STATISTIC_RECORDS)) {
      expect(item.url).toMatch(/^https:\/\//);
    }
    const reads = JSON.stringify(STATISTIC_RECORDS).match(/"read":"(\d{4}-\d{2}-\d{2})"/g) ?? [];
    for (const r of reads) expect(r.slice(8, 18) <= today).toBe(true);
  });
});
