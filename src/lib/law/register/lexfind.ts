/**
 * Reads LexFind's register: for each authority it lists, the acts with their
 * title, systematic number and whether they are in force (design L0). Only
 * these facts are kept; LexFind's keywords are its own editorial work and are
 * not imported.
 *
 * Polite by construction: an identifying user agent, a pause between requests,
 * one request per slice of an authority's systematic tree. A response that is
 * not JSON is retried a few times and then fails the run; nothing is worked
 * around.
 */
import { z } from "zod";
import { LEXFIND, type LawRegisterSource } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import {
  importRegister,
  type ActRow,
  type RegisterImportOptions,
  type RegisterReport,
} from "./import";

const BASE = "https://www.lexfind.ch/api/fe/de";
const USER_AGENT = "solon-law-register (cato@orangecat.ch)";
/** The systematic ids one request names; more than this overruns the URL limit. */
const SLICE = 60;
const PAUSE_MS = 300;

const entitySchema = z.object({
  id: z.number().int(),
  abbreviation: z.string().min(1),
  status: z.object({ total_texts_of_law: z.number().int() }),
});
const nodeSchema = z.object({
  tols: z
    .array(
      z.object({
        id: z.number().int(),
        title: z.string(),
        systematic_number: z.string().nullable(),
        is_active: z.boolean(),
        category_id: z.number().int(),
      }),
    )
    .optional(),
});

export const registerActSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  systematicNumber: z.string().nullable(),
  inForce: z.boolean(),
  categoryId: z.number().int(),
});
export type RegisterAct = z.infer<typeof registerActSchema>;

/** What a retrieval stores: every authority's acts, in force or not. */
export const registerSnapshotSchema = z.object({
  fetchedAt: z.string(),
  authorities: z.array(z.object({ code: z.string().min(1), acts: z.array(registerActSchema) })),
});
export type RegisterSnapshot = z.infer<typeof registerSnapshotSchema>;

export const parseRegisterSnapshot = (bytes: Uint8Array): RegisterSnapshot =>
  registerSnapshotSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));

type Fetch = typeof fetch;

async function getJson(doFetch: Fetch, url: string): Promise<unknown> {
  let last = "";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await doFetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(120_000),
      });
      const text = await response.text();
      if (response.ok) return JSON.parse(text);
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await sleep(2000 * attempt);
  }
  throw new Error(`${url}: ${last}`);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The whole register, as of now. `onProgress` hears each authority as it is
 * read, so a long run can say where it is.
 */
export async function fetchRegister(
  doFetch: Fetch = fetch,
  onProgress: (code: string, acts: number) => void = () => undefined,
  pauseMs: number = PAUSE_MS,
): Promise<RegisterSnapshot> {
  const entities = z.array(entitySchema).parse(await getJson(doFetch, `${BASE}/entities/extended`));
  const authorities: RegisterSnapshot["authorities"] = [];
  for (const entity of entities) {
    const tree = (await getJson(doFetch, `${BASE}/entities/${entity.id}/systematics`)) as Record<
      string,
      unknown
    >;
    const ids = Object.keys(tree).filter((key) => key !== "");
    const byId = new Map<number, RegisterAct>();
    for (let i = 0; i < ids.length; i += SLICE) {
      const query = ids
        .slice(i, i + SLICE)
        .map((id) => `tols_for_systematics[]=${encodeURIComponent(id)}`)
        .join("&");
      const slice = (await getJson(
        doFetch,
        `${BASE}/entities/${entity.id}/systematics?active_only=false&${query}`,
      )) as Record<string, unknown>;
      for (const node of Object.values(slice)) {
        const parsed = nodeSchema.safeParse(node);
        if (!parsed.success) continue;
        for (const tol of parsed.data.tols ?? []) {
          byId.set(tol.id, {
            id: tol.id,
            title: tol.title,
            systematicNumber: tol.systematic_number,
            inForce: tol.is_active,
            categoryId: tol.category_id,
          });
        }
      }
      await sleep(pauseMs);
    }
    // The register states how many acts each authority has. A different count
    // means a slice was missed, and a partial register must never be imported:
    // it would read as acts that disappeared.
    if (byId.size !== entity.status.total_texts_of_law) {
      throw new Error(
        `${entity.abbreviation}: read ${byId.size} acts, the register states ${entity.status.total_texts_of_law}`,
      );
    }
    authorities.push({ code: entity.abbreviation, acts: [...byId.values()] });
    onProgress(entity.abbreviation, byId.size);
  }
  return { fetchedAt: new Date().toISOString(), authorities };
}

/**
 * A stored LexFind snapshot as the generic rows the importer applies, with the
 * authorities and categories the config does not know left out and reported.
 */
export function lexfindRows(
  snapshot: RegisterSnapshot,
  register: Pick<LawRegisterSource, "authorityByCode" | "kindByCategory">,
): { rows: ActRow[]; skipped: { row: string; reason: string }[] } {
  const rows: ActRow[] = [];
  const skipped: { row: string; reason: string }[] = [];
  for (const authority of snapshot.authorities) {
    const key = register.authorityByCode[authority.code];
    if (!key) {
      skipped.push({
        row: authority.code,
        reason: `authority ${authority.code} is not in config (${authority.acts.length} acts)`,
      });
      continue;
    }
    for (const act of authority.acts) {
      const kind = register.kindByCategory[act.categoryId];
      if (!kind) {
        skipped.push({
          row: `${authority.code} ${act.id}`,
          reason: `category ${act.categoryId} is not in config`,
        });
        continue;
      }
      rows.push({
        authority: key,
        kind,
        inForce: act.inForce,
        title: act.title,
        locale: "de",
        identity: { scheme: "lexfind_id", value: String(act.id) },
        systematicNumber: act.systematicNumber,
      });
    }
  }
  return { rows, skipped };
}

/** Reads a stored LexFind snapshot and applies it. */
export async function importLexfindRegister(
  db: Database,
  options: Omit<RegisterImportOptions, "register" | "read">,
): Promise<RegisterReport> {
  return importRegister(db, {
    ...options,
    register: LEXFIND,
    read: () => lexfindRows(parseRegisterSnapshot(options.bytes), LEXFIND),
  });
}
