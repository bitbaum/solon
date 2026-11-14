import { looksLikeSilence, speechChain, speechConfigured, transcribe } from "@bitbaum/ai-kit";
import { checkAssistantRequest, clientIp, toHeaders } from "@/lib/chat/rate-limit";
import { selfOriginOf } from "@/lib/auth/actor";

/** Dictation is as public as the law chat it serves: bounded by origin, size and a per-address rate. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Failures answer with a status and a `code`, never a sentence: the words a
 * person reads are chatkit's localized dictation problems, chosen from the
 * status (401/403 signIn, 429 busy, 413 fileTooLarge, else unavailable). A
 * server sentence here would reach a Russian reader in English.
 */
const fail = (code: string, status: number, headers?: HeadersInit) =>
  Response.json({ code }, { status, headers });

export async function POST(req: Request) {
  if (req.headers.get("origin") !== selfOriginOf(req)) return fail("origin", 403);
  if (!speechConfigured(process.env)) return fail("not-configured", 503);
  const limit = await checkAssistantRequest(clientIp(req.headers), "dictation");
  if (!limit.allowed) return fail("rate-limited", 429, toHeaders(limit));
  const size = Number(req.headers.get("content-length"));
  if (!size || size > MAX_BYTES) return fail("too-large", 413);
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || !audio.size || audio.size > MAX_BYTES)
    return fail("audio-required", 400);
  const locale = form?.get("locale");
  try {
    const result = await transcribe({
      audio,
      filename: audio instanceof File ? audio.name : "dictation.webm",
      language: typeof locale === "string" ? locale.split("-")[0] : undefined,
      chain: speechChain(),
      feature: "dictation",
      timeoutMs: 20000,
      signal: req.signal,
    });
    return Response.json(
      { text: looksLikeSilence(result.text) ? "" : result.text },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return fail("transcription-failed", 503);
  }
}
