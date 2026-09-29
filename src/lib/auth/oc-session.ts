/**
 * Keeping a Solon session honest with OrangeCat.
 *
 * Solon's session is a JWT that Auth.js encrypts into a cookie; nothing on
 * the server remembers it. On its own that JWT would outlive anything
 * OrangeCat does: a person who clicks Disconnect on OrangeCat's Connected
 * apps page, or Sign out everywhere, would stay signed in here until the
 * cookie expired weeks later. Observed on production 2026-09-29.
 *
 * So the JWT carries the OAuth refresh token and the access token's expiry.
 * While the access token is valid the session is trusted as is (OrangeCat's
 * documented bound: a revocation reaches a session within the access-token
 * lifetime, one hour). Once it expires, Solon refreshes against OrangeCat.
 * A refresh that OrangeCat refuses with invalid_grant means the person took
 * the access back, and the session ends; a refresh that fails for any other
 * reason (network, 5xx) keeps the session and tries again a little later,
 * so an OrangeCat outage does not sign everyone out of Solon.
 *
 * Pure: the callback in index.ts hands it the token and a fetch.
 */

/** Seconds before the access token's expiry at which a refresh is due. */
const REFRESH_MARGIN_SECONDS = 60;
/** Wait after a transient refresh failure before trying again. */
const RETRY_AFTER_SECONDS = 60;

export interface OcSessionClaims extends Record<string, unknown> {
  /** OrangeCat actor id (id_token.sub). Absent = not signed in. */
  actorId?: string;
  /** OAuth refresh token OrangeCat issued to Solon for this person. */
  ocRefreshToken?: string;
  /** Access-token expiry, seconds since the epoch. */
  ocExpiresAt?: number;
  /** Earliest time (seconds) to retry after a transient refresh failure. */
  ocRetryAt?: number;
}

export interface OcTokenGrant {
  refresh_token?: string;
  expires_at?: number;
}

/** On sign-in: remember what OrangeCat handed over. */
export function bindOcTokens<T extends OcSessionClaims>(token: T, account: OcTokenGrant): T {
  if (account.refresh_token) token.ocRefreshToken = account.refresh_token;
  if (typeof account.expires_at === "number") token.ocExpiresAt = account.expires_at;
  delete token.ocRetryAt;
  return token;
}

/** True when the access token has (nearly) expired and a retry is not on hold. */
export function ocRefreshDue(token: OcSessionClaims, nowSeconds: number): boolean {
  if (!token.actorId || !token.ocRefreshToken || typeof token.ocExpiresAt !== "number") {
    return false;
  }
  if (typeof token.ocRetryAt === "number" && nowSeconds < token.ocRetryAt) return false;
  return nowSeconds >= token.ocExpiresAt - REFRESH_MARGIN_SECONDS;
}

export type OcRefreshResult =
  | { ok: true; refreshToken: string; expiresAt: number }
  | { ok: false; revoked: true }
  | { ok: false; revoked: false; reason: string };

export interface OcRefreshDeps {
  issuer: string;
  clientId: string;
  clientSecret: string;
  fetch: typeof fetch;
  nowSeconds: number;
}

/** One refresh_token grant against OrangeCat's token endpoint. */
export async function refreshOcTokens(
  refreshToken: string,
  deps: OcRefreshDeps,
): Promise<OcRefreshResult> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: deps.clientId,
    client_secret: deps.clientSecret,
  });
  let res: Response;
  try {
    res = await deps.fetch(`${deps.issuer.replace(/\/$/, "")}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (e) {
    return { ok: false, revoked: false, reason: e instanceof Error ? e.message : "fetch failed" };
  }
  let json: { error?: string; refresh_token?: string; expires_in?: number } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    // a non-JSON body is treated by status below
  }
  if (res.ok && typeof json.expires_in === "number") {
    return {
      ok: true,
      // OrangeCat rotates the refresh token; keep the old one only if it
      // did not send a new one.
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: deps.nowSeconds + json.expires_in,
    };
  }
  // invalid_grant is OrangeCat's word for "revoked, expired or reused" —
  // the only answer that means the person (or OrangeCat) took the access back.
  if (res.status === 400 && json.error === "invalid_grant") {
    return { ok: false, revoked: true };
  }
  return { ok: false, revoked: false, reason: `${res.status} ${json.error ?? ""}`.trim() };
}

/**
 * Apply a refresh outcome to the token. Revoked → the session's identity is
 * dropped, which is how every Solon page reads "signed out". Transient →
 * hold the retry for a minute.
 */
export function applyOcRefresh<T extends OcSessionClaims>(
  token: T,
  result: OcRefreshResult,
  nowSeconds: number,
): T {
  if (result.ok) {
    token.ocRefreshToken = result.refreshToken;
    token.ocExpiresAt = result.expiresAt;
    delete token.ocRetryAt;
    return token;
  }
  if (result.revoked) {
    delete token.actorId;
    delete token.ocRefreshToken;
    delete token.ocExpiresAt;
    delete token.ocRetryAt;
    return token;
  }
  token.ocRetryAt = nowSeconds + RETRY_AFTER_SECONDS;
  return token;
}
