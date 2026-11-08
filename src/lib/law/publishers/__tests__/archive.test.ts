/**
 * The honest route around a refusal: when a publisher's site refuses Solon's
 * reader, the text comes from the Internet Archive's newest copy, and the copy's
 * own address is what is recorded and shown. A stand-in fetch plays both sites.
 */
import { describe, expect, it } from "vitest";
import { archiveCopyOf, originalOf } from "../../archive-copy";
import { actToMarkdown } from "../../markdown";
import type { ActView } from "../../view";
import { botCheckOf, read, USER_AGENT } from "../http";
import { importerVersion } from "../load";
import { triesenberg } from "../linked-documents";

const PAGE = "https://www.triesenberg.li/service/downloads/formulare-und-reglemente/";
const PDF = "https://www.triesenberg.li/wp-content/uploads/2022-01-01_Wasserreglement-1.pdf";
const STAMP = "20250314101500";

/** LiteSpeed's challenge, as Triesenberg serves it to Solon's reader (HTTP 200). */
const BOT_CHECK = `<!DOCTYPE html><html><head><title>Bot Verification</title>
<script src="https://www.google.com/recaptcha/api.js"></script></head>
<body><form id="lsrecaptcha-form"><div class="g-recaptcha"></div></form></body></html>`;

type Route = (url: string) => Response | undefined;

/** A fetch that answers from `routes` and remembers what it was asked and with which agent. */
function standIn(...routes: Route[]) {
  const asked: { url: string; agent: string | null }[] = [];
  const doFetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    asked.push({ url, agent: new Headers(init?.headers).get("user-agent") });
    for (const route of routes) {
      const answer = route(url);
      if (answer) return answer;
    }
    return new Response("not here", { status: 404 });
  }) as unknown as typeof fetch;
  return { doFetch, asked };
}

const availability = (original: string, stamp: string | null): Route => {
  return (url) => {
    if (!url.startsWith("https://archive.org/wayback/available?")) return undefined;
    if (new URL(url).searchParams.get("url") !== original) return undefined;
    const closest = stamp
      ? {
          available: true,
          status: "200",
          timestamp: stamp,
          url: `http://web.archive.org/web/${stamp}/${original}`,
        }
      : undefined;
    return Response.json({ url: original, archived_snapshots: closest ? { closest } : {} });
  };
};

const capture =
  (original: string, stamp: string, body: BodyInit, type = "text/html"): Route =>
  (url) =>
    url === `https://web.archive.org/web/${stamp}id_/${original}`
      ? new Response(body, { status: 200, headers: { "content-type": type } })
      : undefined;

const official =
  (target: string, response: () => Response): Route =>
  (url) =>
    url === target ? response() : undefined;

describe("a publisher that refuses Solon's reader", () => {
  it.each([403, 429, 503])(
    "answers %i: the archive's newest copy is read instead",
    async (status) => {
      const bytes = new TextEncoder().encode("%PDF-1.4 the regulation");
      const { doFetch, asked } = standIn(
        official(PDF, () => new Response("Forbidden", { status })),
        availability(PDF, STAMP),
        capture(PDF, STAMP, bytes, "application/pdf"),
      );
      const got = await read(PDF, doFetch, ["www.triesenberg.li"]);
      expect(new TextDecoder().decode(got.bytes)).toBe("%PDF-1.4 the regulation");
      expect(got.url).toBe(`https://web.archive.org/web/${STAMP}id_/${PDF}`);
      expect(got.copy).toEqual({ url: got.url, original: PDF, capturedOn: "2025-03-14" });
      // Official first, then the archive; Solon says who it is to both, never a browser's name.
      expect(asked.map((a) => a.url)).toEqual([
        PDF,
        `https://archive.org/wayback/available?url=${encodeURIComponent(PDF)}`,
        got.url,
      ]);
      expect(asked.every((a) => a.agent === USER_AGENT)).toBe(true);
    },
  );

  it("serves a bot check in place of the page: that is a refusal too", async () => {
    const html = `<html><head><title>Reglemente</title></head><body>
      <a href="/wp-content/uploads/2022-01-01_Wasserreglement-1.pdf">Wasserreglement</a></body></html>`;
    const { doFetch } = standIn(
      official(PAGE, () => new Response(BOT_CHECK, { status: 200 })),
      availability(PAGE, STAMP),
      capture(PAGE, STAMP, html),
    );
    const got = await read(PAGE, doFetch, ["www.triesenberg.li"]);
    expect(new TextDecoder().decode(got.bytes)).toBe(html);
    expect(got.copy?.capturedOn).toBe("2025-03-14");
  });

  it("is read from itself when it answers, and nothing is asked of the archive", async () => {
    const { doFetch, asked } = standIn(
      official(PDF, () => new Response("%PDF-1.4 own", { status: 200 })),
    );
    const got = await read(PDF, doFetch, ["www.triesenberg.li"]);
    expect(got).toMatchObject({ url: PDF, copy: null });
    expect(asked).toHaveLength(1);
  });

  it("says why when the archive holds no copy, or only a bot check", async () => {
    const none = standIn(
      official(PDF, () => new Response("", { status: 403 })),
      availability(PDF, null),
    );
    await expect(read(PDF, none.doFetch, ["www.triesenberg.li"])).rejects.toThrow(
      `403 for ${PDF}; the Internet Archive holds no copy of it`,
    );

    const challenged = standIn(
      official(PAGE, () => new Response(BOT_CHECK, { status: 200 })),
      availability(PAGE, STAMP),
      capture(PAGE, STAMP, BOT_CHECK),
    );
    await expect(read(PAGE, challenged.doFetch, ["www.triesenberg.li"])).rejects.toThrow(
      /a bot check \("Bot Verification"\) for .*; the Internet Archive's copy is a bot check too/,
    );
  });

  it("does not mistake a missing page for a refusal", async () => {
    const { doFetch, asked } = standIn();
    await expect(read(PDF, doFetch, ["www.triesenberg.li"])).rejects.toThrow(`404 for ${PDF}`);
    expect(asked).toHaveLength(1);
  });
});

describe("a bot check", () => {
  const bytes = (s: string) => new TextEncoder().encode(s);
  it("is known by its title or its challenge, and only in HTML", () => {
    expect(botCheckOf(bytes(BOT_CHECK), "text/html")).toBe("Bot Verification");
    expect(botCheckOf(bytes("<html><title>Just a moment...</title></html>"), null)).toBe(
      "Just a moment...",
    );
    expect(botCheckOf(bytes("<html><title>Reglemente</title><p>Gemeinde</p></html>"), null)).toBe(
      null,
    );
    expect(botCheckOf(bytes("%PDF-1.7 Bot Verification"), "application/pdf")).toBe(null);
  });
});

describe("Triesenberg, read from the archive's copy", () => {
  it("lists its acts under their official addresses, whatever form the copy's links take", async () => {
    const html = `<html><head><title>Formulare und Reglemente</title></head><body>
      <a href="https://www.triesenberg.li/wp-content/uploads/2022-01-01_Wasserreglement-1.pdf">Wasserreglement</a>
      <a href="/wp-content/uploads/2020/05/Abfallreglement.pdf">Abfallreglement</a>
      <a href="https://web.archive.org/web/${STAMP}/https://www.triesenberg.li/wp-content/uploads/Friedhofsreglement.pdf">Friedhofsreglement</a>
      <a href="/wp-content/uploads/Antrag-Baubewilligung.pdf">Antrag Baubewilligung</a>
      </body></html>`;
    const { doFetch } = standIn(
      official(PAGE, () => new Response(BOT_CHECK, { status: 200 })),
      availability(PAGE, STAMP),
      capture(PAGE, STAMP, html),
    );
    const listed = await triesenberg.list(doFetch);
    expect(listed.url).toBe(`https://web.archive.org/web/${STAMP}id_/${PAGE}`);
    expect(listed.acts.map((a) => [a.title, a.pageUrl])).toEqual([
      ["Wasserreglement", PDF],
      [
        "Abfallreglement",
        "https://www.triesenberg.li/wp-content/uploads/2020/05/Abfallreglement.pdf",
      ],
      [
        "Friedhofsreglement",
        "https://www.triesenberg.li/wp-content/uploads/Friedhofsreglement.pdf",
      ],
    ]);
  });
});

describe("a copy's provenance", () => {
  const url = `https://web.archive.org/web/${STAMP}id_/${PDF}`;

  it("is read from the copy's own address: the archive, the original and the day captured", () => {
    expect(archiveCopyOf(url)).toEqual({ url, original: PDF, capturedOn: "2025-03-14" });
    expect(archiveCopyOf(PDF)).toBeNull();
    expect(archiveCopyOf(null)).toBeNull();
    expect(originalOf(`https://web.archive.org/web/${STAMP}/https:/www.triesenberg.li/a.pdf`)).toBe(
      "https://www.triesenberg.li/a.pdf",
    );
    expect(importerVersion(false, true)).toBe("law-text-publisher-1+archive");
    expect(importerVersion(true, false)).toBe("law-text-publisher-1+ocr");
  });

  it("is named in the act's Markdown, never as the publisher's own", () => {
    const act: ActView = {
      id: "a1",
      authority: "li7004",
      kind: "communal_act",
      inForce: true,
      title: "Wasserreglement",
      systematicNumber: null,
      officialUrl: PDF,
      version: {
        lang: "de",
        inForceFrom: "2026-11-08",
        dateBasis: "retrieved",
        status: "authentic",
        sourceUrl: url,
        contentSha256: "0".repeat(64),
        retrievedOn: "2026-11-08",
        provisionCount: 0,
      },
      provisions: [],
    };
    const md = actToMarkdown(act, "https://solon.example");
    expect(md).toContain(`publisher_url: ${PDF}`);
    expect(md).toContain(`source_url: ${url}`);
    expect(md).toContain("copied_from: internet_archive");
    expect(md).toContain("copy_captured_on: 2025-03-14");
  });
});
