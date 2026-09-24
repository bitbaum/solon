import { describe, expect, it } from "vitest";
import { resolveActor } from "../actor";

const SELF = "https://solon.example";
const base = { key: {}, sessionActorId: null, requestOrigin: SELF, selfOrigin: SELF };

describe("resolveActor", () => {
  it("lets a signed-in person act with one click from Solon's own pages", () => {
    expect(resolveActor({ ...base, sessionActorId: "actor-1" })).toEqual({
      ok: true,
      actor: { via: "account", actorId: "actor-1" },
    });
  });

  it("refuses a one-click act triggered from another site", () => {
    const r = resolveActor({
      ...base,
      sessionActorId: "actor-1",
      requestOrigin: "https://evil.example",
    });
    expect(r).toMatchObject({ ok: false, status: 403 });
  });

  it("refuses a one-click act with no Origin header at all", () => {
    const r = resolveActor({ ...base, sessionActorId: "actor-1", requestOrigin: null });
    expect(r).toMatchObject({ ok: false, status: 403 });
  });

  it("asks a visitor with no session to sign in", () => {
    expect(resolveActor(base)).toMatchObject({ ok: false, status: 401 });
  });

  it("takes a signature from anywhere, with or without a session", () => {
    const r = resolveActor({
      ...base,
      key: { address: "1abc", signature: "sig" },
      requestOrigin: null,
    });
    expect(r).toEqual({ ok: true, actor: { via: "key", address: "1abc", signature: "sig" } });
  });

  it("never falls back to the session when half a key was sent", () => {
    const r = resolveActor({ ...base, key: { address: "1abc" }, sessionActorId: "actor-1" });
    expect(r).toMatchObject({ ok: false, status: 401 });
  });
});
