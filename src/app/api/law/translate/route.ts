import { complete, freeChain, usableChain } from "@bitbaum/ai-kit";
import { z } from "zod";
import { locales } from "@/i18n/routing";
import { selfOriginOf } from "@/lib/auth/actor";
import { readJsonBounded } from "@/lib/chat/body";
import { allowAssistantRequest } from "@/lib/chat/rate-limit";
import { db } from "@/lib/db/client";
import { passagesOf } from "@/lib/law/act-translation";
import { translateMissing } from "@/lib/law/translate";
import { loadActView } from "@/lib/law/view";

const Body = z.object({
  act: z.uuid(),
  page: z.number().int().min(1).max(10_000),
  to: z.enum(locales),
});

/**
 * Translates one page of an act into the reader's language, so the next view
 * of the page shows it (src/lib/law/translate.ts). The client names the page;
 * its words are read here, never sent by the client. Each passage is
 * translated once for every reader: what is already held is not asked again.
 */
export async function POST(req: Request) {
  if (req.headers.get("origin") !== selfOriginOf(req))
    return Response.json({ error: "Request origin was not recognized." }, { status: 403 });
  const read = await readJsonBounded(req);
  if (!read.ok) return Response.json({ error: "Send a shorter request." }, { status: read.status });
  const parsed = Body.safeParse(read.body);
  if (!parsed.success) return Response.json({ error: "Name an act and a page." }, { status: 400 });
  const chain = usableChain(freeChain("SOLON"), process.env);
  if (!chain.length)
    return Response.json({ error: "Translation is not available just now." }, { status: 503 });
  const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowAssistantRequest(address, "translate"))
    return Response.json(
      { error: "Please wait a few minutes before asking again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );

  const { act: id, page, to } = parsed.data;
  const act = await loadActView(db, { id, lang: to, page });
  if (!act?.version) return Response.json({ error: "That act has no text." }, { status: 404 });
  const result = await translateMissing(db, passagesOf(act), act.version.lang, to, (messages) =>
    complete({ messages, chain, env: process.env, maxTokens: 6000, timeoutMs: 90_000 }).then(
      (r) => ({ text: r.text, id: r.id }),
    ),
  );
  return Response.json(result, { status: result.failed > 0 && result.kept === 0 ? 502 : 200 });
}
