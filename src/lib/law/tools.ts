/**
 * The law register as tools a model can call: find which authorities make law,
 * search the provisions in force, find an act, read its contents and read one
 * provision with the page it was read from and the hash of the copy.
 *
 * One definition serves every caller: the MCP server (/api/mcp) for any AI app,
 * and Solon's own law chat. Each tool runs the code its /api/v1/law twin runs,
 * so there is never a second implementation of how the law is searched or read.
 * Descriptions are written for a model deciding whether to call the tool.
 */
import { z } from "zod";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { SITE } from "./site";
import { chainOf, levelOf } from "./places";
import { loadLawChanges } from "./register/changes";
import { loadLawCoverage, readProvision, searchActs } from "./register/coverage";
import { SEARCH_LIMIT_MAX, searchProvisions } from "./search";
import { loadActContents, loadActView } from "./view";

const today = () => new Date().toISOString().slice(0, 10);
const authorityName = (key: string) => LAW_AUTHORITIES.find((a) => a.key === key)?.name ?? key;
const actUrl = (id: string, path?: string) =>
  path ? `${SITE}/law/${id}?at=${encodeURIComponent(path)}#${path}` : `${SITE}/law/${id}`;

const AUTHORITY_KEYS = LAW_AUTHORITIES.map((a) => a.key) as [string, ...string[]];
const authority = z.enum(AUTHORITY_KEYS);
const actId = z.string().regex(/^[0-9a-f-]{36}$/, "an act id from law_search or law_find_acts");
const anchor = z.string().regex(/^[A-Za-z0-9_.-]{1,80}$/, "an anchor such as art_270_b or par_19");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const lang = z.string().regex(/^[a-z]{2}$/);

export interface LawTool<Shape extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  input: Shape;
  run(args: z.infer<z.ZodObject<Shape>>, ctx: { db: Database }): Promise<Record<string, unknown>>;
}

const tool = <Shape extends z.ZodRawShape>(t: LawTool<Shape>) => t;

export const LAW_TOOLS = [
  tool({
    name: "law_authorities",
    title: "Who makes law, and what Solon holds",
    description:
      "Lists every authority whose law Solon holds — the Swiss Confederation, intercantonal bodies, each of the 26 cantons, Liechtenstein, Luxembourg, and the communes whose acts Solon reads — with its key and how many acts in force Solon holds, and how many with their text. Call it first to learn the authority keys the other tools take (e.g. 'ch', 'zh', 'ge', 'li', 'lux', 'bfs261', 'li7001').",
    input: {},
    async run(_args, { db }) {
      const coverage = await loadLawCoverage(db);
      return {
        authorities: LAW_AUTHORITIES.map((a) => {
          const c = coverage.authorities.find((x) => x.key === a.key);
          return {
            key: a.key,
            name: a.name,
            place: a.place,
            level: levelOf(a),
            // The authorities whose law also applies where this one's does, nearest first.
            appliesAlsoFrom: chainOf(a.key)
              .slice(1)
              .map((x) => x.key),
            solonUrl: `${SITE}/law/place/${a.key}`,
            actsInForce: c?.inForce ?? 0,
            actsWithText: c?.withText ?? 0,
          };
        }),
        totals: coverage.totals,
        registerReadOn: coverage.retrievedOn,
      };
    },
  }),
  tool({
    name: "law_search",
    title: "Search the provisions in force",
    description:
      "Full-text search over every provision in force that Solon holds, ranked so the fundamental act comes before an ordinance. Search with the words the LAW would use, in its language (German for most of Switzerland and Liechtenstein, French for Geneva, Vaud, Neuchâtel, Jura and Luxembourg, Italian for Ticino): either `query` (all its words), `terms` (stems, any may match: ['Fuchs','Wildtier']) or `ideas` (each idea a list of alternative stems; provisions with every idea rank first: [['Miete','Mietzins'],['Erhöhung','erhöhen']]). Narrow with `authorities` (keys from law_authorities; the federal law 'ch' applies everywhere in Switzerland, and only there) and `title` (a word of the act's title, e.g. 'Steuergesetz'). Each hit names the act, the anchor, an excerpt, the publisher's page, the hash of the copy and a Solon link to cite.",
    input: {
      query: z.string().max(300).optional(),
      terms: z.array(z.string().max(60)).max(20).optional(),
      ideas: z
        .array(z.array(z.string().max(60)).max(8))
        .max(5)
        .optional(),
      authorities: z.array(authority).max(10).optional(),
      title: z.string().max(80).optional(),
      lang: lang.optional(),
      limit: z.number().int().min(1).max(SEARCH_LIMIT_MAX).optional(),
    },
    async run(args, { db }) {
      const groups = args.ideas?.map((g) => g.filter(Boolean)).filter((g) => g.length);
      const terms = args.terms?.filter(Boolean);
      if (!args.query?.trim() && !terms?.length && !groups?.length)
        throw new Error("Give `query`, `terms` or `ideas`.");
      const hits = await searchProvisions(db, {
        q: groups?.length || terms?.length ? undefined : args.query,
        terms: terms?.length && !groups?.length ? terms : undefined,
        groups: groups?.length ? groups : undefined,
        authorities: args.authorities,
        title: args.title,
        lang: args.lang,
        limit: args.limit ?? 10,
      });
      return {
        hits: hits.map((h) => ({
          act: h.actId,
          authority: h.authority,
          authorityName: authorityName(h.authority),
          title: h.title,
          number: h.systematicNumber,
          path: h.path,
          heading: h.heading,
          excerpt: h.excerpt,
          inForceFrom: h.inForceFrom,
          dateBasis: h.dateBasis,
          publisherUrl: h.sourceUrl,
          sha256: h.contentSha256,
          solonUrl: actUrl(h.actId, h.path),
        })),
      };
    },
  }),
  tool({
    name: "law_find_acts",
    title: "Find an act",
    description:
      "Finds acts by a word of their title ('Obligationenrecht', 'Steuergesetz', 'Personen- und Gesellschaftsrecht'), by their exact number in the authority's collection ('220', '642.11', '216.0') and/or by authority key. Returns each act's id (for law_read_act and law_read_provision), title, number, kind, whether it is in force, and the publisher's own page. To list a whole place, give only `authority` and page with `offset`.",
    input: {
      title: z.string().max(100).optional(),
      number: z.string().max(40).optional(),
      authority: authority.optional(),
      includeRepealed: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).max(100000).optional(),
    },
    async run(args, { db }) {
      if (!args.title && !args.number && !args.authority)
        throw new Error("Give `title`, `number` or `authority`.");
      const acts = await searchActs(
        db,
        {
          title: args.title,
          number: args.number,
          authority: args.authority,
          inForceOnly: !args.includeRepealed,
        },
        args.limit ?? 25,
        args.offset ?? 0,
      );
      return {
        acts: acts.map((a) => ({
          act: a.id,
          authority: a.authority,
          authorityName: authorityName(a.authority),
          title: a.title,
          number: a.systematicNumber,
          kind: a.kind,
          inForce: a.inForce,
          publisherUrl: a.officialUrl,
          solonUrl: actUrl(a.id),
        })),
      };
    },
  }),
  tool({
    name: "law_read_act",
    title: "Read an act's contents",
    description:
      "An act's title, number, the version in force (its first day, and whether that day is the publisher's or the day Solon read it), the publisher's page and the hash of the copy, and its table of contents: every provision's anchor and heading. Read a provision's text with law_read_provision.",
    input: { act: actId, lang: lang.optional() },
    async run(args, { db }) {
      const view = await loadActView(db, { id: args.act, lang: args.lang ?? "de", page: 1 });
      if (!view) throw new Error("No act with that id.");
      const contents = view.version
        ? await loadActContents(db, { id: args.act, lang: args.lang ?? "de" })
        : [];
      return {
        act: view.id,
        authority: view.authority,
        authorityName: authorityName(view.authority),
        title: view.title,
        number: view.systematicNumber,
        kind: view.kind,
        inForce: view.inForce,
        publisherUrl: view.officialUrl,
        version: view.version,
        solonUrl: actUrl(view.id),
        contents,
      };
    },
  }),
  tool({
    name: "law_read_provision",
    title: "Read one provision",
    description:
      "One provision's full text as in force on a day (today by default), with its heading, the version's dates, the publisher's page it was read from and the sha256 of that page, so a citation can be checked. `path` is the anchor from law_search or law_read_act (art_61, par_19, art_270_b).",
    input: { act: actId, path: anchor, on: isoDate.optional(), lang: lang.optional() },
    async run(args, { db }) {
      const provision = await readProvision(db, {
        actId: args.act,
        path: args.path,
        lang: args.lang ?? "de",
        on: args.on ?? today(),
      });
      if (!provision) throw new Error("No such provision in force on that day.");
      return { ...provision, solonUrl: actUrl(args.act, args.path) };
    },
  }),
  tool({
    name: "law_changes",
    title: "What changed in the law",
    description:
      "What changed in the law Solon holds since a day: acts first held (`new`), acts whose text a newer version replaced (`amended`), and acts no longer in force (`repealed`), each with the day the new text applies from and when Solon recorded it. Narrow with `authorities`. Use it to answer 'what is new in Zurich's law this month' or to check whether a provision you know has changed.",
    input: {
      since: isoDate,
      authorities: z.array(authority).max(10).optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async run(args, { db }) {
      const changes = await loadLawChanges(db, {
        since: args.since,
        authorities: args.authorities,
        limit: args.limit ?? 100,
      });
      return {
        since: args.since,
        changes: changes.map((c) => ({
          ...c,
          authorityName: authorityName(c.authority),
          solonUrl: actUrl(c.actId),
        })),
      };
    },
  }),
] as const;

export type AnyLawTool = (typeof LAW_TOOLS)[number];

/** Validate a model's arguments and run the tool; a bad call says why, in words a model can fix. */
export async function runLawTool(
  name: string,
  args: unknown,
  ctx: { db: Database },
): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  const found = LAW_TOOLS.find((t) => t.name === name) as LawTool | undefined;
  if (!found) return { ok: false, error: `No tool named ${name}.` };
  const parsed = z.object(found.input).safeParse(args ?? {});
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
        .join("; "),
    };
  try {
    return { ok: true, result: await found.run(parsed.data, ctx) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The tool failed." };
  }
}

/** The tools in the OpenAI function shape, for a model call through ai-kit. */
export function lawToolSpecs(names?: readonly string[]) {
  return LAW_TOOLS.filter((t) => !names || names.includes(t.name)).map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(z.object(t.input)),
    },
  }));
}
