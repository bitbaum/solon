/**
 * Ask OrangeCat whether two accounts are one person, without learning who.
 *
 * A person on OrangeCat can hold several identities, and each is a separate
 * account with its own actor id. Solon gives a seat to an account, so without
 * this one person could hold several seats in the same organization, one per
 * identity. OrangeCat answers with a TAG per account: two accounts carry the
 * same tag exactly when one person holds both (orangecat ADR-0014 D7).
 *
 * What Solon learns is only that, and only inside the scope it names. The tag
 * is keyed per client and per scope, so it says nothing about who the person
 * is, which other identities they hold, or their seats in another
 * organization. That is why the scope is the organization, never a constant.
 *
 * THREE ANSWERS, NOT TWO. A tag; "no tag" (the account is not an OrangeCat
 * person's, or Solon has no OrangeCat client configured), which means "cannot
 * be told apart" and is never "a different person"; and "could not ask", which
 * a caller deciding on a seat must treat as a refusal to decide, not as no tag.
 */
const ISSUER = (process.env.ORANGECAT_OAUTH_ISSUER ?? "https://orangecat.ch").replace(/\/$/, "");
const TIMEOUT_MS = 8_000;
const ACTOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAG = /^[0-9a-f]{64}$/;

export type PersonTagAnswer =
  /** `tag` is null when the account cannot be told apart. */
  { ok: true; tag: string | null } | { ok: false; reason: string };

/** The scope Solon asks within: one organization. */
export function personTagScope(organizationId: string): string {
  return `org:${organizationId}`;
}

export interface PersonTagDeps {
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  fetch?: typeof fetch;
}

/** The person tag for one account in one organization. */
export async function personTagFor(
  actorId: string | null | undefined,
  organizationId: string,
  deps: PersonTagDeps = {},
): Promise<PersonTagAnswer> {
  // An account that did not come from OrangeCat has an id that is not an
  // actor id; OrangeCat knows nothing about it.
  if (!actorId || !ACTOR_ID.test(actorId)) return { ok: true, tag: null };

  const clientId = deps.clientId ?? process.env.ORANGECAT_OAUTH_CLIENT_ID;
  const clientSecret = deps.clientSecret ?? process.env.ORANGECAT_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { ok: true, tag: null };

  const id = actorId.toLowerCase();
  try {
    const response = await (deps.fetch ?? fetch)(`${deps.issuer ?? ISSUER}/oauth/person-tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        scope: personTagScope(organizationId),
        subjects: [id],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return { ok: false, reason: `OrangeCat answered ${response.status}` };
    }
    const body = (await response.json()) as { tags?: Record<string, unknown> };
    if (!body || typeof body.tags !== "object" || body.tags === null) {
      return { ok: false, reason: "OrangeCat's answer had no tags" };
    }
    const tag = body.tags[id];
    if (tag === undefined) return { ok: true, tag: null };
    // Anything but a well-formed tag is a broken answer, not "no tag": storing
    // it would make a uniqueness rule out of noise.
    if (typeof tag !== "string" || !TAG.test(tag)) {
      return { ok: false, reason: "OrangeCat's answer was not a tag" };
    }
    return { ok: true, tag };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "request failed" };
  }
}
