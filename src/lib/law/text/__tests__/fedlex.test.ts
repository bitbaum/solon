import { describe, expect, it } from "vitest";
import { listVersionsOn, parseProvisions, WHOLE_ACT } from "../fedlex";

const page = (body: string) =>
  `<html><body><div id="lawcontent"><div id="preface"><h1 class="erlasstitel">Ein Gesetz</h1></div>${body}</div></body></html>`;

describe("parseProvisions", () => {
  const html = page(`
    <article id="art_1"><a name="a1"></a><h6 class="heading"><a href="#art_1"><b>Art. 1</b> Zweck</a></h6>
      <div class="collapseable"><p class="absatz"><sup>1</sup>&nbsp;Dieses Gesetz regelt A &amp; B.<sup><a href="#fn1">1</a></sup></p>
      <p class="absatz"><sup>2</sup>&nbsp;Es gilt <b>überall</b>.</p></div></article>
    <article id="art_270_b"><h6 class="heading"><b>Art. 270b</b> Anfechtung</h6><div><p>Der Mieter kann anfechten.</p></div></article>
    <article id="art_1"><h6><b>Art. 1</b> Doppelt</h6><p>never twice</p></article>`);

  it("splits an act into its articles under the publisher's anchors, in order", () => {
    const provisions = parseProvisions(html);
    expect(provisions.map((p) => p.path)).toEqual(["art_1", "art_270_b"]);
    expect(provisions[0]!.heading).toBe("Art. 1 Zweck");
    expect(provisions[1]!.heading).toBe("Art. 270b Anfechtung");
  });

  it("keeps paragraph numbers, drops footnote marks, decodes entities", () => {
    expect(parseProvisions(html)[0]!.text).toBe(
      "1 Dieses Gesetz regelt A & B.\n2 Es gilt überall.",
    );
  });

  it("reads an act with no articles as one provision holding the whole page", () => {
    const provisions = parseProvisions(
      page(`<div id="preamble"><p class="absatz">Das Departement bestätigt den Empfang.</p></div>`),
    );
    expect(provisions).toHaveLength(1);
    expect(provisions[0]).toMatchObject({ path: WHOLE_ACT, heading: "Ein Gesetz" });
    expect(provisions[0]!.text).toContain("Das Departement bestätigt den Empfang.");
  });

  it("finds nothing in a page that is not an act", () => {
    expect(parseProvisions("<html><body>Not found</body></html>")).toEqual([]);
  });
});

describe("listVersionsOn", () => {
  const binding = (cc: string, n: string, date: string, url: string) => ({
    cc: { value: cc },
    n: { value: n },
    date: { value: date },
    url: { value: url },
  });

  it("asks for the Classified Compilation's versions applying on the day, and keeps the latest per act", async () => {
    let sent = "";
    const doFetch = (async (_url: string, init?: RequestInit) => {
      sent = decodeURIComponent(String(init?.body).replace(/\+/g, " "));
      return new Response(
        JSON.stringify({
          results: {
            bindings: [
              binding("https://x/eli/cc/1/1", "220", "2020-01-01", "https://x/old.html"),
              binding("https://x/eli/cc/1/1", "220", "2024-07-01", "https://x/new.html"),
              binding("https://x/eli/cc/2/2", "101", "1999-01-01", "https://x/bv.html"),
            ],
          },
        }),
      );
    }) as typeof fetch;
    const versions = await listVersionsOn("2026-10-23", "de", doFetch);
    expect(versions.map((v) => [v.sr, v.date, v.url]).sort()).toEqual([
      ["101", "1999-01-01", "https://x/bv.html"],
      ["220", "2024-07-01", "https://x/new.html"],
    ]);
    expect(sent).toContain("eli/cc/");
    expect(sent).toContain("DEU");
    expect(sent).toContain('?end >= "2026-10-23"');
  });

  it("refuses a language the publisher does not serve and a day that is not a date", async () => {
    await expect(listVersionsOn("2026-10-23", "en")).rejects.toThrow("does not serve language en");
    await expect(listVersionsOn("tomorrow", "de")).rejects.toThrow("ISO date");
  });
});
