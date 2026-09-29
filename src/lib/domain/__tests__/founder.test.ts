import { describe, expect, it } from "vitest";
import { founderRule, genesisRefusalCopy, genesisVerdict } from "../founder";

const GEORGE = "c9e52937-6020-4cc0-9bf5-5b41538248e5";

describe("founderRule", () => {
  it("names nobody when the deployment sets nothing, or only whitespace", () => {
    expect(founderRule({}).founderActorId).toBeNull();
    expect(founderRule({ SOLON_FOUNDER_ACTOR_ID: "  " }).founderActorId).toBeNull();
  });

  it("names exactly the configured actor, trimmed", () => {
    expect(founderRule({ SOLON_FOUNDER_ACTOR_ID: ` ${GEORGE} ` }).founderActorId).toBe(GEORGE);
  });
});

describe("genesisVerdict", () => {
  it("closes the seat to everyone while no founder is named", () => {
    // The old rule — first signed-in person wins — must not survive as the
    // fallback: an unset variable is the most likely state of a fresh deploy.
    expect(genesisVerdict(GEORGE, { founderActorId: null })).toEqual({
      allowed: false,
      reason: "unnamed",
    });
  });

  it("admits only the named founder", () => {
    const rule = { founderActorId: GEORGE };
    expect(genesisVerdict(GEORGE, rule)).toEqual({ allowed: true });
    expect(genesisVerdict("someone-else", rule)).toEqual({
      allowed: false,
      reason: "not_founder",
    });
  });

  it("explains each refusal with the way forward, never a bare no", () => {
    for (const reason of ["unnamed", "not_founder"] as const) {
      const copy = genesisRefusalCopy({ allowed: false, reason });
      expect(copy).toMatch(/record is open to you/);
    }
    expect(genesisRefusalCopy({ allowed: false, reason: "unnamed" })).toContain(
      "SOLON_FOUNDER_ACTOR_ID",
    );
  });
});
