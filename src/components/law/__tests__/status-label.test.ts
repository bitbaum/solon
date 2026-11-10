import { describe, expect, it } from "vitest";
import { statusLabel } from "../status-label";

const t = ((key: string) => key) as Parameters<typeof statusLabel>[1];

describe("an act's status beside it", () => {
  it("says nothing when the publisher says the act is in force", () => {
    expect(statusLabel({ inForce: true, statusStated: true }, t)).toBeNull();
  });

  it("says the publisher says it is not in force", () => {
    expect(statusLabel({ inForce: false, statusStated: true }, t)).toBe("index.notInForce");
  });

  it("says the status is not stated, and never reads `inForce` as a statement then", () => {
    expect(statusLabel({ inForce: true, statusStated: false }, t)).toBe("index.statusNotStated");
    expect(statusLabel({ inForce: false, statusStated: false }, t)).toBe("index.statusNotStated");
  });
});
