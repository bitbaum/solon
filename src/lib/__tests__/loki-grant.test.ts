import { describe, expect, it } from "vitest";
import {
  GRANT_MAX_LIFETIME_SECS,
  lokiGrantMessage,
  signLokiGrant,
  verifyLokiGrant,
} from "../loki-grant";

// The vector Loki's own port of the grant is pinned to. Change the format here
// and both suites go red together — which is the point: the two ends of a
// signature must never be free to drift apart.
const VECTOR = {
  secret: "solon-loki-grant-test-vector",
  project: "heidi",
  actorId: "5f2716c8-1111-2222-3333-444455556666",
  exp: 1790000000,
  message:
    "solon-org-grant\nproject:heidi\nactor:5f2716c8-1111-2222-3333-444455556666\nexp:1790000000",
  sig: "337bffe53d4a68dbb26769e1ba5394bad0e86abdfd5e013095ad76d8c219f75d",
};

const grant = { project: VECTOR.project, exp: VECTOR.exp, sig: VECTOR.sig };
const inDate = { secret: VECTOR.secret, nowSecs: VECTOR.exp - 600 };

describe("the grant's canonical form", () => {
  it("signs exactly the pinned bytes", () => {
    expect(lokiGrantMessage(VECTOR)).toBe(VECTOR.message);
  });

  it("produces exactly the pinned signature", () => {
    expect(signLokiGrant(VECTOR, VECTOR.secret)).toBe(VECTOR.sig);
  });
});

describe("verifyLokiGrant", () => {
  it("accepts Loki's grant for the signed-in identity", () => {
    expect(verifyLokiGrant(grant, VECTOR.actorId, inDate)).toEqual({
      valid: true,
      project: "heidi",
    });
  });

  it("refuses the same grant presented by any other identity", () => {
    const verdict = verifyLokiGrant(grant, "someone-else", inDate);
    expect(verdict.valid).toBe(false);
    expect(verdict.valid === false && verdict.reason).toContain("different OrangeCat identity");
  });

  it("refuses a grant whose project was swapped", () => {
    expect(verifyLokiGrant({ ...grant, project: "loki" }, VECTOR.actorId, inDate).valid).toBe(
      false,
    );
  });

  it("refuses a grant at or after its expiry", () => {
    expect(
      verifyLokiGrant(grant, VECTOR.actorId, { secret: VECTOR.secret, nowSecs: VECTOR.exp }).valid,
    ).toBe(false);
  });

  it("refuses a grant claiming to live longer than Solon allows, whatever it says", () => {
    const nowSecs = VECTOR.exp - GRANT_MAX_LIFETIME_SECS - 1;
    expect(verifyLokiGrant(grant, VECTOR.actorId, { secret: VECTOR.secret, nowSecs }).valid).toBe(
      false,
    );
  });

  it("refuses malformed signatures without throwing", () => {
    for (const sig of ["zz", "abcd", VECTOR.sig.toUpperCase(), `${VECTOR.sig}00`]) {
      expect(verifyLokiGrant({ ...grant, sig }, VECTOR.actorId, inDate).valid, sig).toBe(false);
    }
  });

  it("refuses a non-integer expiry", () => {
    expect(verifyLokiGrant({ ...grant, exp: 1.5 }, VECTOR.actorId, inDate).valid).toBe(false);
  });

  it("refuses everything when this Solon holds no shared secret", () => {
    expect(verifyLokiGrant(grant, VECTOR.actorId, { secret: undefined, nowSecs: 0 }).valid).toBe(
      false,
    );
  });

  it("refuses a grant signed with a different secret", () => {
    const forged = signLokiGrant(VECTOR, "not-the-shared-secret");
    expect(verifyLokiGrant({ ...grant, sig: forged }, VECTOR.actorId, inDate).valid).toBe(false);
  });
});
