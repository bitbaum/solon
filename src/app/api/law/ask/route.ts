import { complete, completeStream, freeChain, usableChain } from "@bitbaum/ai-kit";
import { sseResponse } from "@bitbaum/ai-kit/sse";
import { z } from "zod";
import { selfOriginOf } from "@/lib/auth/actor";
import { readJsonBounded } from "@/lib/chat/body";
import type { LawChatEvent } from "@/lib/chat/events";
import { allowAssistantRequest } from "@/lib/chat/rate-limit";
import { db } from "@/lib/db/client";
import { answerMessages, sourcesOf } from "@/lib/law/ask/answer";
import { planResearch, type Completer } from "@/lib/law/ask/plan";
import { refine } from "@/lib/law/ask/refine";
import { retrieve } from "@/lib/law/ask/retrieve";
import { applyScope, scopeContext } from "@/lib/law/ask/scope";

export const maxDuration = 60;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(6000) }))
    .min(1)
    .max(20),
  /** Asked from a place's page: its authorities are always searched. */
  scope: z
    .object({
      place: z.string().min(1).max(120),
      authorities: z.array(z.string().max(40)).max(8),
      topic: z.enum(["tax"]).optional(),
    })
    .optional(),
});

/** Public: the law is public. Bounded by origin, size and a per-address rate. */
export async function POST(req: Request) {
  if (req.headers.get("origin") !== selfOriginOf(req))
    return Response.json({ error: "Request origin was not recognized." }, { status: 403 });
  const read = await readJsonBounded(req);
  if (!read.ok)
    return Response.json({ error: "Send a shorter question." }, { status: read.status });
  const parsed = Body.safeParse(read.body);
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user")
    return Response.json({ error: "Send a question." }, { status: 400 });
  const chain = usableChain(freeChain("SOLON"), process.env);
  if (!chain.length)
    return Response.json({ error: "The assistant is not available just now." }, { status: 503 });
  const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowAssistantRequest(address, "law"))
    return Response.json(
      { error: "Please wait a few minutes before asking again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  const { messages: turns, scope } = parsed.data;
  return sseResponse<LawChatEvent>(
    async (emit, signal) => {
      emit({ type: "step", step: "plan" });
      const ask: Completer = (options) =>
        complete({ ...options, chain, env: process.env, timeoutMs: 20000, signal });
      // A second opinion from the next model in the chain, if the first plan is weak.
      const askAgain: Completer = (options) =>
        complete({
          ...options,
          chain: [...chain.slice(1), ...chain.slice(0, 1)],
          env: process.env,
          timeoutMs: 20000,
          signal,
        });
      const plan = applyScope(await planResearch(turns, ask, askAgain, scopeContext(scope)), scope);
      emit({ type: "plan", authorities: plan.authorities, acts: plan.acts, groups: plan.groups });
      emit({ type: "step", step: "search" });
      const found = await retrieve(db, plan);
      emit({ type: "step", step: "check" });
      const hits = await refine(db, ask, plan, found);
      emit({ type: "sources", sources: sourcesOf(hits) });
      emit({ type: "step", step: "write" });
      let finished = false;
      for await (const delta of completeStream({
        chain,
        env: process.env,
        messages: answerMessages(turns, plan, hits),
        maxTokens: 2400,
        timeoutMs: 40000,
        signal,
      })) {
        if (delta.type === "text") emit({ type: "text", text: delta.text });
        if (delta.type === "end") {
          if (!delta.text.trim()) throw new Error("Empty answer");
          emit({ type: "done", text: delta.text, model: delta.id });
          finished = true;
        }
      }
      if (!finished && !signal.aborted) throw new Error("Incomplete answer");
    },
    {
      signal: req.signal,
      onError: () => ({
        type: "error",
        error: "Solon could not answer just now. Try again, or search the law directly.",
      }),
    },
  );
}
