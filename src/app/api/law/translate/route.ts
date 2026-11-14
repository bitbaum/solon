import { complete, freeChain, usableChain } from "@bitbaum/ai-kit";
import { z } from "zod";
import { locales } from "@/i18n/routing";
import { selfOriginOf } from "@/lib/auth/actor";
import { readJsonBounded } from "@/lib/chat/body";
import { checkAssistantRequest, clientIp, toHeaders } from "@/lib/chat/rate-limit";
import { db } from "@/lib/db/client";
import { passagesOf } from "@/lib/law/act-translation";
import { createPause, isCrawler, translateMissing } from "@/lib/law/translate";
import { loadActView } from "@/lib/law/view";

const Body = z.object({
  act: z.uuid(),
  page: z.number().int().min(1).max(10_000),
  to: z.enum(locales),
});

/** Ten minutes without asking, after every free model refused (lib/law/translate). */
const pause = createPause(10 * 60_000);

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
  // A crawler runs the page's script too. Its page view must not spend the
  // free models every app on the server shares; it reads the authentic text.
  if (isCrawler(req.headers.get("user-agent"))) return new Response(null, { status: 204 });
  const chain = usableChain(freeChain("SOLON"), process.env);
  if (!chain.length || pause.active())
    return Response.json({ error: "Translation is not available just now." }, { status: 503 });
  const limit = await checkAssistantRequest(clientIp(req.headers), "translate");
  if (!limit.allowed)
    return Response.json(
      { error: "Please wait a few minutes before asking again." },
      { status: 429, headers: toHeaders(limit) },
    );

  const { act: id, page, to } = parsed.data;
  const act = await loadActView(db, { id, lang: to, page });
  if (!act?.version) return Response.json({ error: "That act has no text." }, { status: 404 });
  const result = await translateMissing(
    db,
    passagesOf(act),
    act.version.lang,
    to,
    (messages) =>
      complete({
        messages,
        chain,
        env: process.env,
        feature: "law-translate",
        maxTokens: 6000,
        timeoutMs: 90_000,
      }).then((r) => ({ text: r.text, id: r.id })),
    { onUnanswered: pause.start },
  );
  return Response.json(result, { status: result.failed > 0 && result.kept === 0 ? 502 : 200 });
}
