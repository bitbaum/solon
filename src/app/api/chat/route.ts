import { completeStream, freeChain, usableChain } from "@bitbaum/ai-kit";
import { sseResponse } from "@bitbaum/ai-kit/sse";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { selfOriginOf } from "@/lib/auth/actor";
import type { ChatEvent } from "@/lib/chat/events";
import { allowAssistantRequest } from "@/lib/chat/rate-limit";
import { governancePrompt } from "@/lib/chat/prompt";

const Body = z.object({
  locale: z.enum(["en", "de", "fr", "it", "ru"]).default("en"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12000) }))
    .min(1)
    .max(20),
});
export const maxDuration = 45;

export async function POST(req: Request) {
  if (req.headers.get("origin") !== selfOriginOf(req))
    return Response.json({ error: "Request origin was not recognized." }, { status: 403 });
  const session = await auth();
  if (!session) return Response.json({ error: "Sign in to ask Solon." }, { status: 401 });
  // Bound the request before parsing; content-length alone can be absent or forged.
  const reader = req.body?.getReader();
  if (!reader) return Response.json({ error: "A message is required." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 100000) {
      await reader.cancel();
      return Response.json(
        { error: "This conversation is too long. Start a new one." },
        { status: 413 },
      );
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    body = null;
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user")
    return Response.json({ error: "Send a question of up to 12000 characters." }, { status: 400 });
  const chain = usableChain(freeChain("SOLON"), process.env);
  if (!chain.length)
    return Response.json(
      {
        error:
          "Solon's AI is not configured yet. You can still read the rules or draft a proposal below.",
      },
      { status: 503 },
    );
  if (!allowAssistantRequest(session.actorId, "chat"))
    return Response.json(
      { error: "Please wait a few minutes before asking again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  return sseResponse<ChatEvent>(
    async (emit, signal) => {
      let finished = false;
      for await (const delta of completeStream({
        chain,
        env: process.env,
        messages: [
          { role: "system", content: governancePrompt(parsed.data.locale) },
          ...parsed.data.messages,
        ],
        maxTokens: 2400,
        timeoutMs: 35000,
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
        error: "Solon could not answer just now. Try again, or open the rules below.",
      }),
    },
  );
}
