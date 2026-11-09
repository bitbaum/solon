import { complete, freeChain, usableChain } from "@bitbaum/ai-kit";
import { sseResponse } from "@bitbaum/ai-kit/sse";
import { z } from "zod";
import { toLocale } from "@/i18n/routing";
import { selfOriginOf } from "@/lib/auth/actor";
import { readJsonBounded } from "@/lib/chat/body";
import { allowAssistantRequest } from "@/lib/chat/rate-limit";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { gather, writeReport } from "@/lib/statistics/research";
import type { ResearchEvent } from "@/lib/statistics/research-events";
import { researchTools } from "@/lib/statistics/research-tools";

export const dynamic = "force-dynamic";
export const maxDuration = 150;

const Body = z.object({
  question: z.string().trim().min(8).max(500),
  locale: z.string().max(8).default("en"),
});

/**
 * Deep research on a question: tools read what Solon holds (and the web where
 * one is configured), the report is written from those sources alone and
 * checked against them (src/lib/statistics/research.ts) before it is sent.
 * Public, like the law assistant: bounded by origin, size and a rate per address.
 */
export async function POST(req: Request) {
  if (req.headers.get("origin") !== selfOriginOf(req))
    return Response.json({ error: "Request origin was not recognized." }, { status: 403 });
  const read = await readJsonBounded(req);
  if (!read.ok)
    return Response.json({ error: "Send a shorter question." }, { status: read.status });
  const parsed = Body.safeParse(read.body);
  if (!parsed.success) return Response.json({ error: "Send a question." }, { status: 400 });
  const chain = usableChain(freeChain("SOLON"), process.env);
  if (!chain.length)
    return Response.json({ error: "The assistant is not available just now." }, { status: 503 });
  const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowAssistantRequest(address, "research"))
    return Response.json(
      { error: "Please wait a few minutes before asking again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  const { question } = parsed.data;
  const locale = toLocale(parsed.data.locale);

  return sseResponse<ResearchEvent>(
    async (emit, signal) => {
      const tools = researchTools({ db, config: placesConfig, env: process.env });
      emit({ type: "step", step: "search" });
      const run = await gather({
        question,
        tools,
        web: tools.specs.length > 5,
        call: (options) =>
          complete({ ...options, chain, env: process.env, timeoutMs: 25000, signal }),
        onStep: (tool, args) =>
          emit({
            type: "activity",
            tool,
            detail: String(args.query ?? args.metric ?? args.key ?? args.url ?? ""),
          }),
      });
      emit({ type: "sources", sources: run.sources });
      emit({ type: "step", step: "write" });
      const report = await writeReport({
        question,
        sources: run.sources,
        language: locale,
        write: (messages) =>
          complete({
            messages,
            chain,
            env: process.env,
            maxTokens: 1400,
            timeoutMs: 45000,
            signal,
          }),
      });
      if (!report.ok) {
        emit({
          type: "error",
          unverified: true,
          error:
            "The report could not be checked against the sources, so it is not shown. The sources found are listed.",
        });
        return;
      }
      emit({ type: "done", text: report.text, cited: report.cited, model: report.model });
    },
    {
      signal: req.signal,
      onError: () => ({ type: "error", error: "Solon could not research this just now." }),
    },
  );
}
