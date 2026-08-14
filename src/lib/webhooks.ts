import { createHmac } from "node:crypto";

/**
 * Outbound webhook: `decision.finalized`, fired when a voting session closes.
 *
 * The webhook is a doorbell, not a courier: the payload names the decision,
 * and the consumer fetches the decision document itself and re-verifies every
 * signature before acting. Missed deliveries are healed by the consumer's own
 * reconciliation poll, so a best-effort retry here is enough.
 *
 * Env-gated and inert until configured (fleet convention): set
 * SOLON_WEBHOOK_URL and SOLON_WEBHOOK_SECRET to enable. One consumer (OC) is
 * the v1 reality — a DB-backed multi-endpoint rail is deferred until a second
 * consumer exists.
 */
export interface DecisionFinalizedEvent {
  event: "decision.finalized";
  event_id: string;
  decision_id: string;
  org_id: string;
  org_slug: string;
  target: string | null;
  content_hash: string | null;
  outcome: string;
}

const ATTEMPTS = 3;
const BACKOFF_MS = [0, 2000, 10000];

export async function emitDecisionFinalized(payload: Omit<DecisionFinalizedEvent, "event" | "event_id">): Promise<void> {
  const url = process.env.SOLON_WEBHOOK_URL;
  const secret = process.env.SOLON_WEBHOOK_SECRET;
  if (!url || !secret) return; // not configured — silently inert

  const event: DecisionFinalizedEvent = {
    event: "decision.finalized",
    // The decision id IS the idempotency key: a session finalizes exactly once.
    event_id: `decision.finalized:${payload.decision_id}`,
    ...payload,
  };
  const body = JSON.stringify(event);
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt]) await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Solon-Signature": signature },
        body,
      });
      if (res.ok) return;
      console.error(`webhook decision.finalized ${payload.decision_id}: HTTP ${res.status} (attempt ${attempt + 1}/${ATTEMPTS})`);
    } catch (e) {
      console.error(`webhook decision.finalized ${payload.decision_id}: ${e instanceof Error ? e.message : e} (attempt ${attempt + 1}/${ATTEMPTS})`);
    }
  }
}
