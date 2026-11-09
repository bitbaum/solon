import { complete, freeChain, usableChain } from "@bitbaum/ai-kit";
import { z } from "zod";
import { toLocale } from "@/i18n/routing";
import { selfOriginOf } from "@/lib/auth/actor";
import { readJsonBounded } from "@/lib/chat/body";
import { allowAssistantRequest } from "@/lib/chat/rate-limit";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { buildBrief } from "@/lib/statistics/brief";
import { buildDimensionBrief } from "@/lib/statistics/dimension-brief";
import { loadDimensionPage } from "@/lib/statistics/dimension-page";
import { explain } from "@/lib/statistics/explain-run";
import { loadMetricPage } from "@/lib/statistics/metric-page";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Subject = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("metric"),
    metric: z.string().min(1).max(80),
    places: z
      .array(z.string().regex(/^[A-Za-z0-9_-]{1,40}$/))
      .max(40)
      .default([]),
    from: z.string().max(4).optional(),
    to: z.string().max(4).optional(),
  }),
  z.object({
    kind: z.literal("dimension"),
    dimension: z.string().min(1).max(80),
    x: z.string().max(80).optional(),
    y: z.string().max(80).optional(),
  }),
]);
type Subject = z.infer<typeof Subject>;

const Body = z.object({
  locale: z.string().max(8).default("en"),
  question: z.string().trim().min(1).max(300).optional(),
  subject: Subject,
});

/**
 * An AI explanation of one statistics page. The client names the page, never
 * its figures: they are read here from the database, turned into numbered
 * facts and given to the model, and what comes back is checked against them
 * (src/lib/statistics/explain.ts) before it is returned.
 */
export async function POST(req: Request) {
  if (req.headers.get("origin") !== selfOriginOf(req))
    return Response.json({ error: "Request origin was not recognized." }, { status: 403 });
  const read = await readJsonBounded(req);
  if (!read.ok) return Response.json({ error: "Send a shorter request." }, { status: read.status });
  const parsed = Body.safeParse(read.body);
  if (!parsed.success) return Response.json({ error: "Name a statistics page." }, { status: 400 });
  const chain = usableChain(freeChain("SOLON"), process.env);
  if (!chain.length)
    return Response.json({ error: "The assistant is not available just now." }, { status: 503 });
  const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowAssistantRequest(address, "stats"))
    return Response.json(
      { error: "Please wait a few minutes before asking again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );

  const { subject, question } = parsed.data;
  const locale = toLocale(parsed.data.locale);
  // The facts the model reads are English whatever the page's language; it writes in the reader's.
  const facts = await factsFor(subject);
  if (!facts) return Response.json({ error: "That page is not known." }, { status: 404 });

  try {
    const result = await explain(facts, {
      language: locale,
      question,
      ask: (messages) =>
        complete({ messages, chain, env: process.env, maxTokens: 900, timeoutMs: 40000 }),
    });
    if (!result.ok) {
      return Response.json(
        { error: "The explanation could not be checked against the figures, so it is not shown." },
        { status: 502 },
      );
    }
    return Response.json({ text: result.text, cited: result.cited, model: result.model });
  } catch {
    return Response.json({ error: "Solon could not explain this just now." }, { status: 502 });
  }
}

async function factsFor(subject: Subject) {
  if (subject.kind === "metric") {
    const page = await loadMetricPage(db, placesConfig, subject.metric, "en", {
      places: subject.places,
      from: subject.from,
      to: subject.to,
    });
    return page ? buildBrief({ ...page, thisYear: new Date().getUTCFullYear() }, "en") : null;
  }
  const page = await loadDimensionPage(db, placesConfig, subject.dimension, "en", {
    x: subject.x,
    y: subject.y,
  });
  return page ? buildDimensionBrief(page, "en") : null;
}
