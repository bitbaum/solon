/**
 * Between finding the provisions and writing the answer, the model may look
 * further, with the same tools any AI app gets from /api/mcp: search the law
 * again, read a provision or an act's contents, and, when a search backend is
 * configured, search the web and read a page (an authority's deadline, a form,
 * current practice). Two rounds at most; each provision read becomes a source
 * [L#] and each page read a web source [W#]. The pipeline before it stands on
 * its own: if no model can call tools, the answer is written from what the
 * search found, as before.
 */
import { safeJsonObject, TEXT_TOOL_PROTOCOL_HINT, type ChatMessage } from "@bitbaum/ai-kit";
import { readPage, webSearch, type WebEnv } from "@bitbaum/ai-kit/web";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { lawToolSpecs, runLawTool } from "../tools";
import { searchProvisions, type ProvisionHit } from "../search";
import { loadActView } from "../view";
import { readProvision } from "../register/coverage";
import type { Plan, Turn } from "./plan";

export interface WebSource {
  url: string;
  title: string;
  text: string;
}

export interface ToolCaller {
  (options: { messages: ChatMessage[]; maxTokens: number; tools: unknown[] }): Promise<{
    text: string;
    toolCalls: { id: string; name: string; args: string }[];
  }>;
}

export const MAX_ROUNDS = 2;
const MAX_CALLS = 8;
const MAX_SOURCES = 22;
const MAX_PAGES = 3;
const PAGE_CHARS = 6000;

export const webLookupConfigured = (env: WebEnv): boolean =>
  Boolean(
    env.SEARXNG_URL?.trim() || env.BRAVE_SEARCH_API_KEY?.trim() || env.TAVILY_API_KEY?.trim(),
  );

const WEB_SPECS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the open web: an authority's own page (deadlines, forms, how to file or pay, fees), current practice, news about a change in the law. Returns titles, links and snippets; read a page with web_read. Web pages are not law.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" }, site: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_read",
      description: "Read one web page found by web_search, as text, to cite it.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
  },
];

const label = (hit: ProvisionHit, i: number) =>
  `[L${i + 1}] ${LAW_AUTHORITIES.find((a) => a.key === hit.authority)?.name ?? hit.authority} — ${hit.title ?? hit.systematicNumber ?? ""} — ${hit.heading}`;

const instructions = (
  web: boolean,
) => `You research a question about the law Solon holds (Switzerland, Liechtenstein, Luxembourg, Estonia and the US states of Wyoming and New Hampshire) before it is answered. The provisions found so far are listed below.

If they settle the question, reply with the single word DONE.
Otherwise call tools to find what is missing: the actual rule, a canton's or a commune's own act, the provision a cross-reference points to${web ? ", or an authority's own page for what the law leaves to it (a deadline set each year, a form, where to file or pay)" : ""}. Search with the law's own words in its language (German, French or Italian; Estonian for Estonia; English for Wyoming and New Hampshire). Read a provision before relying on it. ${web ? "Web pages are not law; prefer official pages (admin.ch, the canton's or commune's site, llv.li, gouvernement.lu, guichet.lu)." : ""}

${TEXT_TOOL_PROTOCOL_HINT}`;

async function hitOf(db: Database, act: string, path: string): Promise<ProvisionHit | null> {
  const on = new Date().toISOString().slice(0, 10);
  const provision = await readProvision(db, { actId: act, path, lang: "de", on });
  if (!provision) return null;
  const view = await loadActView(db, { id: act, lang: "de", page: 1 });
  return {
    actId: act,
    authority: view?.authority ?? "",
    title: view?.title ?? null,
    systematicNumber: view?.systematicNumber ?? null,
    path,
    heading: provision.heading,
    lang: provision.lang,
    excerpt: "",
    text: provision.text.slice(0, 1800),
    inForceFrom: provision.inForceFrom,
    dateBasis: provision.dateBasis,
    sourceUrl: provision.sourceUrl,
    contentSha256: provision.contentSha256,
    rank: 0,
  };
}

export async function research(input: {
  db: Database;
  turns: readonly Turn[];
  plan: Plan;
  hits: readonly ProvisionHit[];
  call: ToolCaller;
  env: WebEnv;
  onActivity?: (label: string) => void;
  /** What else to look for, when the question is not only what the law is (consult.ts). */
  purpose?: string;
}): Promise<{ hits: ProvisionHit[]; web: WebSource[] }> {
  const { db, plan, call, env, onActivity } = input;
  const hits = [...input.hits];
  const web: WebSource[] = [];
  const seen = new Set(hits.map((h) => `${h.actId}#${h.path}`));
  const withWeb = webLookupConfigured(env);
  const tools = [...lawToolSpecs(), ...(withWeb ? WEB_SPECS : [])];
  const add = (hit: ProvisionHit | null) => {
    if (!hit || hits.length >= MAX_SOURCES) return false;
    const key = `${hit.actId}#${hit.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    hits.push(hit);
    return true;
  };
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: input.purpose
        ? `${instructions(withWeb)}\n\n${input.purpose}`
        : instructions(withWeb),
    },
    {
      role: "user",
      content: `Question: ${plan.question}\nPlaces: ${plan.authorities.join(", ")}\n\nPROVISIONS FOUND\n${hits.map(label).join("\n") || "(none)"}`,
    },
  ];
  let calls = 0;
  for (let round = 0; round < MAX_ROUNDS && calls < MAX_CALLS; round++) {
    let reply: Awaited<ReturnType<ToolCaller>>;
    try {
      reply = await call({ messages, maxTokens: 1200, tools });
    } catch {
      break; // no model could call tools: what was found stands
    }
    if (!reply.toolCalls.length) break;
    const results: string[] = [];
    for (const tc of reply.toolCalls.slice(0, MAX_CALLS - calls)) {
      calls++;
      const args = safeJsonObject(tc.args) ?? {};
      if (tc.name === "web_search" && withWeb) {
        const query = String(args.query ?? "").slice(0, 200);
        onActivity?.(`web:${query}`);
        const found = await webSearch(
          query,
          { limit: 6, site: args.site ? String(args.site) : undefined },
          { env },
        );
        results.push(
          `${tc.name}(${JSON.stringify(args)}) → ${JSON.stringify(
            found.status === "found"
              ? found.results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet }))
              : { status: found.status },
          )}`,
        );
      } else if (tc.name === "web_read" && withWeb && web.length < MAX_PAGES) {
        const url = String(args.url ?? "");
        onActivity?.(`read:${url}`);
        const page = await readPage(url, { maxChars: PAGE_CHARS, timeoutMs: 10000 });
        if (page.ok) {
          web.push({ url: page.url, title: page.title, text: page.text });
          results.push(
            `${tc.name}(${url}) → [W${web.length}] ${page.title}\n${page.text.slice(0, 2500)}`,
          );
        } else results.push(`${tc.name}(${url}) → could not read: ${page.failure.reason}`);
      } else if (tc.name === "law_read_provision") {
        onActivity?.(`law:${String(args.path ?? "")}`);
        const out = await runLawTool(tc.name, args, { db });
        if (out.ok) {
          const hit = await hitOf(db, String(args.act), String(args.path));
          if (add(hit))
            results.push(`${tc.name} → added as [L${hits.length}] ${hit?.heading}\n${hit?.text}`);
          else results.push(`${tc.name} → already among the provisions found`);
        } else results.push(`${tc.name} → ${out.error}`);
      } else if (tc.name === "law_search") {
        onActivity?.(`search:${JSON.stringify(args.ideas ?? args.terms ?? args.query ?? "")}`);
        const out = await runLawTool(tc.name, args, { db });
        if (!out.ok) {
          results.push(`${tc.name} → ${out.error}`);
          continue;
        }
        // The hits come back in full and join the sources, a few at a time.
        const more = await searchProvisions(db, {
          q: typeof args.query === "string" ? args.query : undefined,
          terms: Array.isArray(args.terms) ? (args.terms as string[]) : undefined,
          groups: Array.isArray(args.ideas) ? (args.ideas as string[][]) : undefined,
          authorities: Array.isArray(args.authorities) ? (args.authorities as string[]) : undefined,
          title: typeof args.title === "string" ? args.title : undefined,
          limit: 5,
        });
        const added = more.filter(add);
        results.push(
          `${tc.name} → ${added.length ? added.map((h) => label(h, hits.indexOf(h))).join("\n") : "nothing new"}`,
        );
      } else {
        onActivity?.(`law:${tc.name}`);
        const out = await runLawTool(tc.name, args, { db });
        results.push(
          `${tc.name} → ${out.ok ? JSON.stringify(out.result).slice(0, 4000) : out.error}`,
        );
      }
    }
    messages.push(
      {
        role: "assistant",
        content: reply.text || reply.toolCalls.map((t) => `TOOL: ${t.name}`).join("\n"),
      },
      {
        role: "user",
        content: `Results:\n\n${results.join("\n\n")}\n\nCall more tools, or reply DONE.`,
      },
    );
  }
  return { hits, web };
}
