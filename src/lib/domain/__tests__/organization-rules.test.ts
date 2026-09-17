import { describe, expect, it } from "vitest";
import {
  RESERVED_SLUGS,
  descriptionProblem,
  nameProblem,
  slugProblem,
} from "../organization-rules";

// The founding form checks these as the founder types and the API enforces the
// same functions, so a rule that drifts here drifts in both places at once.
describe("slugProblem", () => {
  it("accepts ordinary addresses", () => {
    for (const slug of ["heidi", "wednesday-supper", "a1b", "x".repeat(40)]) {
      expect(slugProblem(slug), slug).toBeNull();
    }
  });

  it("rejects what would not survive as an address", () => {
    expect(slugProblem("ab")).not.toBeNull(); // too short
    expect(slugProblem("x".repeat(41))).not.toBeNull(); // too long
    expect(slugProblem("Heidi")).not.toBeNull(); // uppercase
    expect(slugProblem("-heidi")).not.toBeNull();
    expect(slugProblem("heidi-")).not.toBeNull();
    expect(slugProblem("hei di")).not.toBeNull();
    expect(slugProblem("hei_di")).not.toBeNull();
    expect(slugProblem("a--b")).toBe("use single hyphens only");
  });

  it("refuses `new`, which would shadow the founding page itself", () => {
    expect(RESERVED_SLUGS.has("new")).toBe(true);
    expect(slugProblem("new")).toBe('"new" is reserved');
  });
});

describe("nameProblem", () => {
  it("accepts a name", () => {
    expect(nameProblem("Heidi")).toBeNull();
  });

  it("rejects a line break, which could forge a line in the signed text", () => {
    expect(nameProblem("Heidi\nactor:someone-else")).toBe("a name cannot contain a line break");
    expect(nameProblem("Heidi\r")).toBe("a name cannot contain a line break");
  });

  it("rejects names that are blank or too long", () => {
    expect(nameProblem(" a ")).not.toBeNull();
    expect(nameProblem("x".repeat(81))).not.toBeNull();
  });
});

describe("descriptionProblem", () => {
  it("allows none, and caps the length", () => {
    expect(descriptionProblem(null)).toBeNull();
    expect(descriptionProblem("x".repeat(500))).toBeNull();
    expect(descriptionProblem("x".repeat(501))).not.toBeNull();
  });
});
