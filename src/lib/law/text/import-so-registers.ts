/**
 * Registers the Republic of South Ossetia's acts (L0): the Parliament's three
 * listings and the Constitution (PARLIAMENTRSO) and the President's decrees,
 * treaties and documents (PRESIDENTRUO), as acts of the authority `so`, each
 * named by `<publisher>:<its own id>` and linked to the publisher's page. The
 * texts are the next step. Safe to rerun and to stop: the register keeps what
 * a retrieval lists and reports what a later one no longer does, so a run
 * limited to some pages is a smaller listing, never a retraction.
 *
 * Neither publisher states whether an act is still in force. Every act is
 * recorded `inForce: true`, meaning only "published by the authority and not
 * marked withdrawn by it"; the coverage figures for this authority say so.
 */
import { PARLIAMENTRSO, PRESIDENTRUO } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister, type ActRow, type RegisterReport } from "../register/import";
import { parseListing, type ListedNode } from "./drupal-listing";
import { parsePosts, type WpPost } from "./wp-rest";
import { crawlDelayMs } from "./ukleg";

export interface SoRegisterOptions {
  snapshots: SnapshotStore;
  /** Most listing pages (parliament) or API pages (president) to read in this run. */
  limit?: number;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  /** Parliament only: read this term alone (its number in PARLIAMENTRSO.terms). */
  term?: string;
  onProgress?: (message: string) => void;
}

export interface SoRegisterReport {
  publisher: string;
  pagesRead: number;
  acts: number;
  register: RegisterReport;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(
  doFetch: typeof fetch,
  url: string,
  userAgent: string,
  accept: string,
): Promise<string> {
  const response = await doFetch(url, {
    headers: { "user-agent": userAgent, accept },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

export async function registerParliament(
  db: Database,
  options: SoRegisterOptions,
): Promise<SoRegisterReport> {
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const config = PARLIAMENTRSO;
  let pauseMs = options.pauseMs;
  if (pauseMs === undefined) {
    // The site's robots.txt asks every robot for a long crawl-delay; follow it, and stop if it cannot be read.
    const robots = await get(doFetch, config.robotsUrl, config.userAgent, "text/plain");
    pauseMs = crawlDelayMs(robots) ?? 5000;
    say(`pace: ${pauseMs / 1000} s between requests (robots.txt)`);
  }
  const limit = options.limit ?? Infinity;
  const rows = new Map<string, ActRow>();
  const trace: { term: string; page: number; ids: string[] }[] = [];
  let pagesRead = 0;
  const row = (id: string, title: string, kind: ActRow["kind"]): ActRow => ({
    authority: config.authority,
    kind,
    inForce: true,
    title,
    locale: config.locale,
    identity: { scheme: "publisher_ref", value: `${config.key}:${id}` },
    systematicNumber: null,
    more: [{ scheme: "official_url", value: config.pageUrl.replace("{id}", id) }],
  });
  if (!options.term) {
    rows.set(
      config.constitution.id,
      row(config.constitution.id, config.constitution.title, config.constitution.kind),
    );
  }
  for (const { term, kind } of config.terms.filter(
    (t) => !options.term || t.term === options.term,
  )) {
    for (let page = 0; pagesRead < limit; page++) {
      if (pagesRead > 0) await sleep(pauseMs);
      const html = await get(
        doFetch,
        config.listingUrl.replace("{term}", term).replace("{page}", String(page)),
        config.userAgent,
        "text/html",
      );
      pagesRead++;
      const listed: ListedNode[] = parseListing(html);
      say(`term ${term} page ${page}: ${listed.length} acts`);
      if (listed.length === 0) break;
      trace.push({ term, page, ids: listed.map((n) => n.id) });
      for (const node of listed)
        if (!rows.has(node.id)) rows.set(node.id, row(node.id, node.title, kind));
    }
  }
  const acts = [...rows.values()];
  const register = await importRegister(db, {
    register: {
      key: `${config.key}-register`,
      licenceSpdx: config.licenceSpdx,
      identityScheme: "publisher_ref",
    },
    read: () => ({ rows: acts, skipped: [] }),
    bytes: new TextEncoder().encode(JSON.stringify(trace)),
    url: config.homepage,
    retrievedAt: new Date(),
    snapshots: options.snapshots,
    dryRun: options.dryRun,
  });
  return { publisher: config.key, pagesRead, acts: acts.length, register };
}

export async function registerPresident(
  db: Database,
  options: SoRegisterOptions,
): Promise<SoRegisterReport> {
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const config = PRESIDENTRUO;
  const pauseMs = options.pauseMs ?? config.pauseMs;
  const limit = options.limit ?? Infinity;
  const rows = new Map<string, ActRow>();
  const trace: { category: string; page: number; ids: string[] }[] = [];
  let pagesRead = 0;
  for (const { category, kind } of config.categories) {
    for (let page = 1; pagesRead < limit; page++) {
      if (pagesRead > 0) await sleep(pauseMs);
      const url = config.postsUrl.replace("{category}", category).replace("{page}", String(page));
      const response = await doFetch(url, {
        headers: { "user-agent": config.userAgent, accept: "application/json" },
        signal: AbortSignal.timeout(60_000),
      });
      // Past the last page the API answers 400 ("rest_post_invalid_page_number").
      if (response.status === 400 && page > 1) break;
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      const posts: WpPost[] = parsePosts(await response.json());
      const totalPages = Number(response.headers.get("x-wp-totalpages") ?? "1");
      pagesRead++;
      say(`category ${category} page ${page} of ${totalPages}: ${posts.length} posts`);
      trace.push({ category, page, ids: posts.map((p) => p.id) });
      for (const post of posts) {
        if (rows.has(post.id)) continue;
        rows.set(post.id, {
          authority: config.authority,
          kind,
          inForce: true,
          title: post.title,
          locale: config.locale,
          identity: { scheme: "publisher_ref", value: `${config.key}:${post.id}` },
          systematicNumber: null,
          more: [{ scheme: "official_url", value: post.link }],
        });
      }
      if (page >= totalPages) break;
    }
  }
  const acts = [...rows.values()];
  const register = await importRegister(db, {
    register: {
      key: `${config.key}-register`,
      licenceSpdx: config.licenceSpdx,
      identityScheme: "publisher_ref",
    },
    read: () => ({ rows: acts, skipped: [] }),
    bytes: new TextEncoder().encode(JSON.stringify(trace)),
    url: config.homepage,
    retrievedAt: new Date(),
    snapshots: options.snapshots,
    dryRun: options.dryRun,
  });
  return { publisher: config.key, pagesRead, acts: acts.length, register };
}
