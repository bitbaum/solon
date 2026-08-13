import { NextResponse } from "next/server";
import { Democracy, type VoteChoice } from "@/lib/solon/democracy";
import { consumeLocalRateLimit } from "@/lib/server/rate-limit";
import { prisma } from "@/lib/db";
import {
  VOTE_CHOICES,
  isCompactMessageSignature,
  isMainnetP2pkhAddress,
  isVoteSessionId,
} from "@/lib/solon/vote-policy";

function invalidSessionId(sessionId: string) {
  return !isVoteSessionId(sessionId);
}

async function readBoundedBody(req: Request, maxBytes: number): Promise<string | null> {
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

/**
 * Cast a cryptographically-signed vote. The body must carry the member's
 * Bitcoin address and a Bitcoin signed-message signature over the canonical
 * vote message (see lib/bitcoin/message.ts). The server verifies the
 * signature; an invalid one is rejected and never stored.
 *
 * Body: { choice: 'yes'|'no'|'abstain', address: string, signature: string }
 */
export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (invalidSessionId(sessionId)) {
    return NextResponse.json({ success: false, error: 'sessionId must be a UUID' }, { status: 400 });
  }
  // The process-local brake intentionally uses a coarse key: forwarding
  // headers are deployment-controlled and must not become attacker-created
  // Map keys or a limiter bypass. Production must enforce byte and rate limits
  // at the trusted reverse proxy before this handler runs.
  const coarseRateLimit = consumeLocalRateLimit(`vote:session:${sessionId}`, { limit: 30, windowMs: 60_000 });
  if (!coarseRateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many vote attempts; retry later' },
      { status: 429, headers: { 'Retry-After': String(coarseRateLimit.retryAfterSeconds) } },
    );
  }
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return NextResponse.json({ success: false, error: 'Request body is too large' }, { status: 413 });
  }
  const rawBody = await readBoundedBody(req, 4096);
  if (rawBody === null) {
    return NextResponse.json({ success: false, error: 'Request body is too large' }, { status: 413 });
  }
  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'A valid JSON body is required' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: 'A JSON object body is required' }, { status: 400 });
  }
  const bodyRecord = body as Record<string, unknown>;
  const unexpectedFields = Object.keys(bodyRecord).filter((key) => !['choice', 'address', 'signature'].includes(key));
  if (unexpectedFields.length) {
    return NextResponse.json({ success: false, error: `Unexpected field: ${unexpectedFields[0]}` }, { status: 400 });
  }
  const { choice, address, signature } = bodyRecord;

  if (typeof choice !== 'string' || typeof address !== 'string' || typeof signature !== 'string' || !choice || !address || !signature) {
    return NextResponse.json({ success: false, error: 'choice, address and signature are required strings' }, { status: 400 });
  }
  if (!VOTE_CHOICES.includes(choice as VoteChoice)) {
    return NextResponse.json({ success: false, error: `choice must be one of ${VOTE_CHOICES.join(', ')}` }, { status: 400 });
  }
  if (!isMainnetP2pkhAddress(address)) {
    return NextResponse.json({ success: false, error: 'address must be a mainnet P2PKH Bitcoin address' }, { status: 400 });
  }
  if (!isCompactMessageSignature(signature)) {
    return NextResponse.json({ success: false, error: 'signature must be a 65-byte compact Bitcoin message signature in base64' }, { status: 400 });
  }

  const rateLimit = consumeLocalRateLimit(`vote:${sessionId}:${address}`, { limit: 10, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many vote attempts; retry later' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  let result;
  try {
    result = await new Democracy().submitVote(sessionId, { address, choice: choice as VoteChoice, signature });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to submit vote' }, { status: 500 });
  }

  if (!result.stored) {
    const status = result.failure === 'invalid-signature' ? 401 : 422;
    return NextResponse.json({ success: false, error: result.reason ?? 'Vote was not stored', details: result }, { status });
  }
  return NextResponse.json({ success: true, data: result });
}

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  if (invalidSessionId(params.sessionId)) {
    return NextResponse.json({ success: false, error: 'sessionId must be a UUID' }, { status: 400 });
  }
  try {
    const session = await prisma.voting_sessions.findUnique({
      where: { id: params.sessionId },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Voting session not found' }, { status: 404 });
    }
    const tally = await new Democracy().tally(params.sessionId);
    return NextResponse.json({ success: true, data: { sessionId: params.sessionId, tally } });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to load vote tally' }, { status: 500 });
  }
}
