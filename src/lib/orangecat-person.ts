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
 * account, or OrangeCat left it out of its answer, which it does for an account
 * that never signed in to Solon through OrangeCat), which means "cannot be told
 * apart" and is never "a different person"; and "could not ask" (OrangeCat
 * refused, broke or was unreachable, or Solon has no OrangeCat client
 * configured), which a caller deciding on a seat must treat as a refusal to
 * decide, not as no tag.
 *
 * A tag is the answer NOW. OrangeCat lets a person hand an identity over to
 * someone else, and from then on its tag is the new person's. So a tag Solon
 * stored earlier is a cache, never the truth: a decision asks again.
 */
const ISSUER = (process.env.ORANGECAT_OAUTH_ISSUER ?? "https://orangecat.ch").replace(/\/$/, "");
const TIMEOUT_MS = 8_000;
const ACTOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAG = /^[0-9a-f]{64}$/;
/** OrangeCat answers for at most this many subjects per request. */
export const PERSON_TAG_BATCH = 100;

export type PersonTagAnswer =
  /** `tag` is null when the account cannot be told apart. */
  { ok: true; tag: string | null } | { ok: false; reason: string };

/** Whether an account id is an OrangeCat actor id, the only kind OrangeCat can tag. */
export function isOrangeCatActorId(id: string | null | undefined): id is string {
  return !!id && ACTOR_ID.test(id);
}

/** The scope Solon asks within: one organization. */
export function personTagScope(organizationId: string): string {
  return `org:${organizationId}`;
}

export type PersonTagsAnswer =
  /** One entry per id asked about, keyed as given; null when it cannot be told apart. */
  { ok: true; tags: Record<string, string | null> } | { ok: false; reason: string };

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
  if (!actorId) return { ok: true, tag: null };
  const answer = await personTagsFor([actorId], organizationId, deps);
  if (!answer.ok) return answer;
  return { ok: true, tag: answer.tags[actorId] ?? null };
}

/**
 * The person tags for many accounts in one organization, asked in as few
 * requests as OrangeCat allows (PERSON_TAG_BATCH subjects each). All or
 * nothing: if any request cannot be asked, the whole answer is "could not ask",
 * because a seat decision made on half the roster is not a decision.
 */
export async function personTagsFor(
  actorIds: readonly string[],
  organizationId: string,
  deps: PersonTagDeps = {},
): Promise<PersonTagsAnswer> {
  const tags: Record<string, string | null> = {};
  // An account that did not come from OrangeCat has an id that is not an
  // actor id; OrangeCat knows nothing about it, so it is not asked about.
  const subjects = new Set<string>();
  for (const actorId of actorIds) {
    tags[actorId] = null;
    if (ACTOR_ID.test(actorId)) subjects.add(actorId.toLowerCase());
  }
  if (subjects.size === 0) return { ok: true, tags };

  const clientId = deps.clientId ?? process.env.ORANGECAT_OAUTH_CLIENT_ID;
  const clientSecret = deps.clientSecret ?? process.env.ORANGECAT_OAUTH_CLIENT_SECRET;
  // Without a client Solon cannot ask. That is not "cannot be told apart":
  // reading it so would seat a person twice on any shell without the keys.
  if (!clientId || !clientSecret) return { ok: false, reason: "no OrangeCat client configured" };

  const found = new Map<string, string>();
  const all = [...subjects];
  for (let start = 0; start < all.length; start += PERSON_TAG_BATCH) {
    const chunk = all.slice(start, start + PERSON_TAG_BATCH);
    const answer = await askOrangeCat(chunk, organizationId, clientId, clientSecret, deps);
    if (!answer.ok) return answer;
    for (const [id, tag] of answer.tags) found.set(id, tag);
  }
  for (const actorId of actorIds) {
    if (ACTOR_ID.test(actorId)) tags[actorId] = found.get(actorId.toLowerCase()) ?? null;
  }
  return { ok: true, tags };
}

async function askOrangeCat(
  subjects: string[],
  organizationId: string,
  clientId: string,
  clientSecret: string,
  deps: PersonTagDeps,
): Promise<{ ok: true; tags: Map<string, string> } | { ok: false; reason: string }> {
  try {
    const response = await (deps.fetch ?? fetch)(`${deps.issuer ?? ISSUER}/oauth/person-tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        scope: personTagScope(organizationId),
        subjects,
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
    const tags = new Map<string, string>();
    for (const id of subjects) {
      const tag = body.tags[id];
      // Left out: OrangeCat cannot tell this account apart (for one, it never
      // signed in to Solon through OrangeCat).
      if (tag === undefined) continue;
      // Anything but a well-formed tag is a broken answer, not "no tag":
      // storing it would make a uniqueness rule out of noise.
      if (typeof tag !== "string" || !TAG.test(tag)) {
        return { ok: false, reason: "OrangeCat's answer was not a tag" };
      }
      tags.set(id, tag);
    }
    return { ok: true, tags };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "request failed" };
  }
}
