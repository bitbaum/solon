/**
 * Loads each country's constitution from the source the plan chose
 * (data/law/plan.json, src/lib/law/plan): a Wikisource page or a document
 * someone other than the publisher keeps, stored as a `copy` with who keeps it
 * and the day it was read. One reader for every country: a new country is a
 * choice in the plan and a line naming the provision that puts its law
 * outside copyright, never new code.
 *
 * Refused, and reported with the reason: a country with no copyright basis
 * recorded; a copy that does not cut into articles; a copy older than the last
 * amendment the index records. A country whose constitution Solon already
 * holds from its publisher is left alone. Safe to rerun: a country whose copy
 * is held is read again only with `again`.
 */
import { and, eq, sql } from "drizzle-orm";
import { LICENCES } from "@/lib/config/places/licences";
import type { Database } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { legalActIdentifiers } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import type { LawPlan } from "../plan/schema";
import { importRegister } from "../register/import";
import { cleanPdfText, documentText } from "./cantonal";
import { blockText } from "./html-text";
import {
  cutArticles,
  refuseCopy,
  wikisourceRestUrl,
  wikisourceText,
  wikisourceTitle,
} from "./plan-copy";
import { storeVersion } from "./store";

export const PLAN_COPY_IMPORTER_VERSION = "law-text-plan-copy-1";
const USER_AGENT = "SolonLawReader/1.0 (https://solon.orangecat.ch; law register)";

export interface PlanCopyOptions {
  snapshots: SnapshotStore;
  /** Only these countries (ISO 3166-1 alpha-2). */
  countries?: readonly string[];
  /** Read a country again although its copy is held. */
  again?: boolean;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  pauseMs?: number;
  today?: string;
  onProgress?: (message: string) => void;
}

export interface PlanCopyReport {
  stored: string[];
  skipped: { country: string; reason: string }[];
  failures: { country: string; reason: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetches politely: a 429 or 503 waits as long as the server asks (at most two minutes), five times. */
async function politeFetch(doFetch: typeof fetch, url: string, pauseMs: number) {
  for (let attempt = 1; ; attempt++) {
    const response = await doFetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(120_000),
    });
    if ((response.status !== 429 && response.status !== 503) || attempt >= 5) return response;
    const asked = Number(response.headers.get("retry-after"));
    await sleep(
      Math.min(
        120_000,
        Number.isFinite(asked) && asked > 0 ? asked * 1000 : pauseMs * 2 ** attempt,
      ),
    );
  }
}

/** The act that stands for a country's constitution in the plan: `plan:<ISO>:constitution`. */
export const constitutionRef = (iso: string) => `plan:${iso}:constitution`;

/** Authorities whose constitution Solon holds with a text from a reader other than this one. */
async function heldElsewhere(db: Database): Promise<Set<string>> {
  const rows = rowsOf<{ authority: string }>(
    await db.execute(sql`
      SELECT DISTINCT a.authority FROM legal_acts a
      JOIN legal_act_versions v ON v.act_id = a.id AND v.in_force_to IS NULL
      JOIN sources s ON s.id = v.source_id
      WHERE a.kind = 'constitution' AND a.in_force
        AND s.importer_version NOT LIKE 'law-text-plan-copy-%'`),
  );
  return new Set(rows.map((r) => r.authority));
}

export async function importPlanCopies(
  db: Database,
  plan: LawPlan,
  options: PlanCopyOptions,
): Promise<PlanCopyReport> {
  const doFetch = options.fetchImpl ?? fetch;
  const say = options.onProgress ?? (() => undefined);
  const pauseMs = options.pauseMs ?? 3000;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const report: PlanCopyReport = { stored: [], skipped: [], failures: [] };
  const elsewhere = await heldElsewhere(db);
  let requests = 0;
  const entries = Object.entries(plan.countries).filter(
    ([iso, p]) => p.constitution.chosen && (!options.countries || options.countries.includes(iso)),
  );
  for (const [iso, country] of entries) {
    const chosen = country.constitution.chosen!;
    try {
      if (elsewhere.has(country.authority)) {
        report.skipped.push({ country: iso, reason: "held from its publisher" });
        continue;
      }
      if (!country.copyright) throw new Error("no copyright basis recorded in the plan");
      if (!LICENCES.some((l) => l.spdx === country.copyright!.spdx)) {
        throw new Error(`licence ${country.copyright.spdx} is not in the policy`);
      }
      const ref = constitutionRef(iso);
      // The constitution the country's register already lists, if it lists exactly one: the copy
      // is its text, not a second act. Several listed, the plan cannot say which.
      const listed = rowsOf<{ id: string; copied: boolean }>(
        await db.execute(sql`
          SELECT a.id, EXISTS (
            SELECT 1 FROM legal_act_versions v JOIN sources s ON s.id = v.source_id
            WHERE v.act_id = a.id AND v.in_force_to IS NULL
              AND s.importer_version LIKE 'law-text-plan-copy-%'
          ) AS copied
          FROM legal_acts a
          WHERE a.authority = ${country.authority} AND a.kind = 'constitution' AND a.in_force`),
      );
      if (listed.length > 1)
        throw new Error(`${listed.length} constitutions listed for ${country.authority}`);
      if (listed[0]?.copied && !options.again) {
        report.skipped.push({ country: iso, reason: "copy held" });
        continue;
      }
      if (requests++ > 0) await sleep(pauseMs);
      const address = chosen.kind === "wikisource" ? wikisourceRestUrl(chosen.url) : chosen.url;
      const response = await politeFetch(doFetch, address, pauseMs);
      if (!response.ok) throw new Error(`${address}: HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const isPdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
      const html = new TextDecoder().decode(bytes);
      const text = isPdf
        ? cleanPdfText(await documentText(bytes, "pdf"))
        : chosen.kind === "wikisource"
          ? wikisourceText(html)
          : blockText(html);
      const provisions = cutArticles(text);
      const refused = refuseCopy(provisions, text, country.constitution.inForce?.amended ?? null);
      if (refused) throw new Error(refused);
      const title =
        chosen.title ?? (chosen.kind === "wikisource" ? wikisourceTitle(chosen.url) : null);
      if (!title) throw new Error("the plan names no title for this copy");
      const host = new URL(chosen.url).hostname;
      if (options.dryRun) {
        say(`${iso}: ${provisions.length} provisions from ${host} (dry run)`);
        report.stored.push(iso);
        continue;
      }
      let actId = listed[0]?.id;
      if (!actId) {
        const register = await importRegister(db, {
          register: {
            key: `plan-${iso.toLowerCase()}-constitution`,
            licenceSpdx: country.copyright.spdx,
            identityScheme: "publisher_ref",
          },
          read: () => ({
            rows: [
              {
                authority: country.authority,
                kind: "constitution",
                inForce: true,
                // In force by Constitute's index, not by a statement of the publisher.
                statusStated: false,
                title,
                locale: chosen.lang,
                identity: { scheme: "publisher_ref", value: ref },
                systematicNumber: null,
              },
            ],
            skipped: [],
          }),
          bytes: new TextEncoder().encode(JSON.stringify({ iso, chosen })),
          url: chosen.url,
          retrievedAt: new Date(),
          snapshots: options.snapshots,
        });
        if (register.status === "failed") throw new Error(register.problems.join("; "));
        const [act] = await db
          .select({ actId: legalActIdentifiers.actId })
          .from(legalActIdentifiers)
          .where(
            and(
              eq(legalActIdentifiers.scheme, "publisher_ref"),
              eq(legalActIdentifiers.value, ref),
            ),
          )
          .limit(1);
        actId = act?.actId;
      }
      if (!actId) throw new Error("the act was not registered");
      await storeVersion(
        db,
        options.snapshots,
        {
          actId,
          lang: chosen.lang,
          inForceFrom: today,
          dateBasis: "retrieved",
          status: "copy",
          format: isPdf ? "pdf" : "html",
          bytes,
          url: chosen.url,
          provisions,
          source: {
            key: `plan-copy:${host}`,
            licenceSpdx: country.copyright.spdx,
            importerVersion: PLAN_COPY_IMPORTER_VERSION,
          },
        },
        false,
      );
      report.stored.push(iso);
      say(`${iso}: ${provisions.length} provisions from ${host}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      report.failures.push({ country: iso, reason });
      say(`${iso}: ${reason}`);
    }
  }
  return report;
}
