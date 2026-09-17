import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A grant from Loki: "the holder of this OrangeCat identity owns this project."
 *
 * WHY THIS EXISTS
 *
 * Founding an organization is permissionless — any recognized OrangeCat
 * identity with a Bitcoin key may do it. That is right for governance, and it
 * opens one door that must stay shut: attribution by coincidence. If Loki's
 * fleet register paired a project with the Solon organization of the same
 * name, anyone could found `loki` and appear, on a public register, to govern
 * a product they have nothing to do with.
 *
 * So an organization is attributed to a project only when Loki vouched for it.
 * Loki signs this message for a project owner whose OrangeCat identity it has
 * linked; Solon checks it against the SESSION's actor id — never one taken
 * from the request — and records `organizations.claimed_project`. Squatting a
 * name then costs someone a vanity slug, never attribution.
 *
 * WHY THE WEBHOOK SECRET
 *
 * Both deployments already hold SOLON_WEBHOOK_SECRET, and a second shared
 * secret would be a second thing to rotate in step. Reuse is safe because the
 * signed bytes cannot collide: a webhook signs a JSON body, which begins with
 * `{`, and a grant signs a line that begins `solon-org-grant`.
 *
 * Loki carries its own port of lokiGrantMessage/signLokiGrant, pinned to this
 * one by a shared test vector — change the format here and both suites go red.
 */

export interface LokiGrant {
  /** The Loki project slug the founder owns. */
  project: string;
  /** Unix seconds after which the grant is refused. */
  exp: number;
  /** Lowercase hex HMAC-SHA256 over lokiGrantMessage(). */
  sig: string;
}

/**
 * The longest a grant may claim to live. Loki mints short ones; this bounds the
 * damage of a leaked link or a clock that is badly wrong, whatever `exp` says.
 */
export const GRANT_MAX_LIFETIME_SECS = 24 * 60 * 60;

/** Canonical bytes Loki signs. Golden-tested — both sides must produce these exactly. */
export function lokiGrantMessage(params: {
  project: string;
  actorId: string;
  exp: number;
}): string {
  return `solon-org-grant\nproject:${params.project}\nactor:${params.actorId}\nexp:${params.exp}`;
}

export function signLokiGrant(
  params: { project: string; actorId: string; exp: number },
  secret: string,
): string {
  return createHmac("sha256", secret).update(lokiGrantMessage(params)).digest("hex");
}

export type GrantVerdict = { valid: true; project: string } | { valid: false; reason: string };

/**
 * Is this a grant Loki issued, for THIS actor, still in date?
 *
 * `actorId` must be the signed-in session's — passing a value from the request
 * would let one person present another's grant as their own.
 */
export function verifyLokiGrant(
  grant: LokiGrant,
  actorId: string,
  opts: { secret: string | undefined; nowSecs?: number },
): GrantVerdict {
  // Defaulted here rather than read by each caller, so a page can check a grant
  // without reading the clock during render.
  const nowSecs = opts.nowSecs ?? Math.floor(Date.now() / 1000);
  if (!opts.secret) {
    return { valid: false, reason: "this Solon cannot check links from Loki (no shared secret)" };
  }
  if (!Number.isInteger(grant.exp))
    return { valid: false, reason: "the link from Loki is malformed" };
  if (grant.exp <= nowSecs) {
    return {
      valid: false,
      reason: "the link from Loki has expired — open it again from your project page",
    };
  }
  if (grant.exp > nowSecs + GRANT_MAX_LIFETIME_SECS) {
    return { valid: false, reason: "the link from Loki claims a lifetime Solon does not accept" };
  }
  if (!/^[0-9a-f]{64}$/.test(grant.sig)) {
    return { valid: false, reason: "the link from Loki is malformed" };
  }

  const expected = Buffer.from(
    signLokiGrant({ project: grant.project, actorId, exp: grant.exp }, opts.secret),
    "hex",
  );
  const given = Buffer.from(grant.sig, "hex");
  // Both are 32 bytes by now (the regex above), so timingSafeEqual cannot throw.
  if (!timingSafeEqual(expected, given)) {
    // Deliberately one message for "wrong actor" and "forged": telling them apart
    // would confirm to a forger which half they got right.
    return {
      valid: false,
      reason: "the link from Loki was issued to a different OrangeCat identity",
    };
  }
  return { valid: true, project: grant.project };
}
