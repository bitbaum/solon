import { describe, expect, it, vi } from "vitest";
import { applyOcRefresh, bindOcTokens, ocRefreshDue, refreshOcTokens } from "../oc-session";

const NOW = 1_800_000_000;
const deps = (fetch: typeof globalThis.fetch) => ({
  issuer: "https://orangecat.ch/",
  clientId: "solon",
  clientSecret: "s3cret",
  fetch,
  nowSeconds: NOW,
});
const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

// A Solon session must not outlive what OrangeCat allows. Pinned here so the
// JWT-only session never silently goes back to "signed in until the cookie
// expires" — the state observed on production 2026-09-29 after Disconnect.
describe("oc-session", () => {
  it("binds the refresh token and expiry OrangeCat handed over at sign-in", () => {
    const t = bindOcTokens(
      { actorId: "a1", ocRetryAt: 5 },
      { refresh_token: "r1", expires_at: NOW + 3600 },
    );
    expect(t).toEqual({ actorId: "a1", ocRefreshToken: "r1", ocExpiresAt: NOW + 3600 });
  });

  it("trusts the session while the access token is valid, refreshes once it is not", () => {
    const t = { actorId: "a1", ocRefreshToken: "r1", ocExpiresAt: NOW + 3600 };
    expect(ocRefreshDue(t, NOW)).toBe(false);
    expect(ocRefreshDue(t, NOW + 3600 - 60)).toBe(true);
    expect(ocRefreshDue(t, NOW + 4000)).toBe(true);
  });

  it("never refreshes a session that has nothing to refresh with", () => {
    expect(ocRefreshDue({ actorId: "a1" }, NOW)).toBe(false);
    expect(ocRefreshDue({ ocRefreshToken: "r1", ocExpiresAt: 0 }, NOW)).toBe(false);
  });

  it("holds the retry after a transient failure", () => {
    const t = { actorId: "a1", ocRefreshToken: "r1", ocExpiresAt: 0, ocRetryAt: NOW + 30 };
    expect(ocRefreshDue(t, NOW)).toBe(false);
    expect(ocRefreshDue(t, NOW + 30)).toBe(true);
  });

  it("sends a refresh_token grant with client_secret_post and rotates the token", async () => {
    const fetch = reply(200, { access_token: "x", refresh_token: "r2", expires_in: 3600 });
    const r = await refreshOcTokens("r1", deps(fetch));
    expect(r).toEqual({ ok: true, refreshToken: "r2", expiresAt: NOW + 3600 });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://orangecat.ch/oauth/token");
    expect(init.method).toBe("POST");
    expect(String(init.body)).toBe(
      "grant_type=refresh_token&refresh_token=r1&client_id=solon&client_secret=s3cret",
    );
  });

  it("keeps the old refresh token when OrangeCat sends none back", async () => {
    const r = await refreshOcTokens("r1", deps(reply(200, { access_token: "x", expires_in: 60 })));
    expect(r).toEqual({ ok: true, refreshToken: "r1", expiresAt: NOW + 60 });
  });

  it("reads invalid_grant as the person taking the access back", async () => {
    const r = await refreshOcTokens("r1", deps(reply(400, { error: "invalid_grant" })));
    expect(r).toEqual({ ok: false, revoked: true });
  });

  it("treats every other failure as transient", async () => {
    expect(await refreshOcTokens("r1", deps(reply(503, {})))).toMatchObject({
      ok: false,
      revoked: false,
    });
    expect(
      await refreshOcTokens("r1", deps(reply(401, { error: "invalid_client" }))),
    ).toMatchObject({ ok: false, revoked: false });
    const down = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    expect(await refreshOcTokens("r1", deps(down))).toEqual({
      ok: false,
      revoked: false,
      reason: "ECONNREFUSED",
    });
  });

  it("ends the session on revocation and only the session", () => {
    const t = applyOcRefresh(
      { actorId: "a1", ocRefreshToken: "r1", ocExpiresAt: 0, email: "g@x" },
      { ok: false, revoked: true },
      NOW,
    );
    expect(t).toEqual({ email: "g@x" });
  });

  it("keeps the session and backs off on a transient failure", () => {
    const t = applyOcRefresh(
      { actorId: "a1", ocRefreshToken: "r1", ocExpiresAt: 0 },
      { ok: false, revoked: false, reason: "503" },
      NOW,
    );
    expect(t).toEqual({ actorId: "a1", ocRefreshToken: "r1", ocExpiresAt: 0, ocRetryAt: NOW + 60 });
  });

  it("stores the rotated token on success and clears any hold", () => {
    const t = applyOcRefresh(
      { actorId: "a1", ocRefreshToken: "r1", ocExpiresAt: 0, ocRetryAt: NOW },
      { ok: true, refreshToken: "r2", expiresAt: NOW + 3600 },
      NOW,
    );
    expect(t).toEqual({ actorId: "a1", ocRefreshToken: "r2", ocExpiresAt: NOW + 3600 });
  });
});
