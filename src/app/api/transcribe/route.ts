import { looksLikeSilence, speechChain, speechConfigured, transcribe } from "@bitbaum/ai-kit";
import { allowAssistantRequest } from "@/lib/chat/rate-limit";
import { auth } from "@/lib/auth";
import { selfOriginOf } from "@/lib/auth/actor";

export async function POST(req: Request) {
  if (req.headers.get("origin") !== selfOriginOf(req))
    return Response.json({ error: "Origin not allowed" }, { status: 403 });
  const session = await auth();
  if (!session) return Response.json({ error: "Sign in to dictate." }, { status: 401 });
  if (!speechConfigured(process.env))
    return Response.json(
      { error: "Dictation is not configured. Please type your question." },
      { status: 503 },
    );
  if (!allowAssistantRequest(session.actorId, "dictation"))
    return Response.json(
      { error: "Please wait before dictating again, or type your question." },
      { status: 429 },
    );
  const size = Number(req.headers.get("content-length"));
  if (!size || size > 8 * 1024 * 1024)
    return Response.json({ error: "Please use a shorter recording." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || !audio.size || audio.size > 8 * 1024 * 1024)
    return Response.json({ error: "An audio recording is required." }, { status: 400 });
  const locale = form?.get("locale");
  try {
    const result = await transcribe({
      audio,
      filename: audio instanceof File ? audio.name : "dictation.webm",
      language: typeof locale === "string" ? locale.split("-")[0] : undefined,
      chain: speechChain(),
      timeoutMs: 20000,
      signal: req.signal,
    });
    return Response.json(
      { text: looksLikeSilence(result.text) ? "" : result.text },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Dictation failed. Try again or type your question." },
      { status: 503 },
    );
  }
}
