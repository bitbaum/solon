import type { Actor } from "@/lib/domain/proof";

export type ActorResolution =
  { ok: true; actor: Actor } | { ok: false; status: 401 | 403; reason: string };

/**
 * Who is acting on a write, decided in one place for every route.
 *
 * A signature in the body wins: it proves the act on its own, needs no
 * session, and is the only path agents use. Otherwise the signed-in OrangeCat
 * identity acts — the one-click default — but only for a request that came
 * from Solon's own pages. A cookie rides along on requests other sites trigger;
 * a same-origin check is what keeps "one click" from meaning "one click on
 * somebody else's page".
 */
export function resolveActor(input: {
  key: { address?: string | null; signature?: string | null };
  sessionActorId: string | null | undefined;
  requestOrigin: string | null;
  selfOrigin: string;
}): ActorResolution {
  const { address, signature } = input.key;
  if (address && signature) return { ok: true, actor: { via: "key", address, signature } };
  if (address || signature) {
    return {
      ok: false,
      status: 401,
      reason: "a signed act needs both the address and the signature",
    };
  }
  if (!input.sessionActorId) {
    return { ok: false, status: 401, reason: "sign in with OrangeCat first" };
  }
  if (input.requestOrigin !== input.selfOrigin) {
    return { ok: false, status: 403, reason: "this request did not come from Solon" };
  }
  return { ok: true, actor: { via: "account", actorId: input.sessionActorId } };
}

/** Did this request come from Solon's own pages? Required for every cookie-only write. */
export function isSameOrigin(req: Request): boolean {
  return req.headers.get("origin") === selfOriginOf(req);
}

/** The origin this server answers as, from the request it is answering. */
export function selfOriginOf(req: Request): string {
  const configured = process.env.AUTH_URL;
  if (configured) return new URL(configured).origin;
  return new URL(req.url).origin;
}
