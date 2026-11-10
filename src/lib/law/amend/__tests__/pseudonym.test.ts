import { describe, expect, it } from "vitest";
import { namesOn, pseudonym } from "../pseudonym";

describe("a person's name on a proposal", () => {
  it("is the same for one person on one proposal, and never their account", () => {
    const a = pseudonym("actor-1", "amendment-1");
    expect(a).toBe(pseudonym("actor-1", "amendment-1"));
    expect(a).toMatch(/^anon:[0-9a-f]{32}$/);
    expect(a).not.toContain("actor-1");
  });

  it("cannot be linked across proposals or people", () => {
    const names = new Set([
      pseudonym("actor-1", "amendment-1"),
      pseudonym("actor-1", "amendment-2"),
      pseudonym("actor-2", "amendment-1"),
    ]);
    expect(names.size).toBe(3);
  });

  it("writes the pseudonym first and still recognises a row written under the account", () => {
    expect(namesOn({ via: "account", actorId: "x" }, "p")).toEqual([
      pseudonym("x", "p"),
      "actor:x",
    ]);
    expect(namesOn({ via: "key", address: "bc1q", signature: "s" }, "p")).toEqual(["btc:bc1q"]);
  });
});
