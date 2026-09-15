import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ORIGINATOR_SHARE_POLICY_KEY,
  ORIGINATOR_SHARE_V1,
  originatorShareContentHash,
  parseOriginatorSharePolicy,
  splitOriginatorShare,
} from "../originator-share";

describe("originator_share v1 — the seeded rule", () => {
  // Golden hash: what a voter signs over for this exact content, and what
  // OrangeCat re-derives before honouring it. If this changes, v1 changed
  // under the seed, which is a forgery, not a refactor.
  it("has the genesis contentHash", () => {
    expect(originatorShareContentHash()).toBe(
      "8f6ff3cf6103ed5b792ed598085b80211840a9079a310bbc9364f026ba7f7b0d",
    );
  });

  it("is what the seed migration stores, byte for byte", () => {
    const sql = readFileSync(
      join(__dirname, "../../../../drizzle/0002_seed_originator_share.sql"),
      "utf8",
    );
    const stored = /'originator_share',\s*1,\s*'((?:[^']|'')*)'/
      .exec(sql)?.[1]
      ?.replace(/''/g, "'");
    expect(stored).toBeDefined();
    expect(JSON.parse(stored!)).toEqual(ORIGINATOR_SHARE_V1);
    expect(sql).toContain(`'${ORIGINATOR_SHARE_POLICY_KEY}'`);
  });

  it("validates against its own schema", () => {
    expect(parseOriginatorSharePolicy(ORIGINATOR_SHARE_V1)).toEqual(ORIGINATOR_SHARE_V1);
    expect(() =>
      parseOriginatorSharePolicy({ ...ORIGINATOR_SHARE_V1, share_bps: 10001 }),
    ).toThrow();
    expect(() => parseOriginatorSharePolicy({ ...ORIGINATOR_SHARE_V1, base: "gross" })).toThrow();
  });

  it("reads originators from a register it does not own", () => {
    expect(ORIGINATOR_SHARE_V1.beneficiaries.register).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\/bitbaum\/fleet\/main\/registers\/origin\.json$/,
    );
  });
});

describe("splitOriginatorShare — deterministic, integer, recountable", () => {
  it("routes share_bps of net revenue equally per originator", () => {
    const s = splitOriginatorShare(1_000_000, ["cato", "ada"]);
    expect(s.poolSats).toBe(100_000);
    expect(s.payouts).toEqual({ ada: 50_000, cato: 50_000 });
    expect(s.carrySats).toBe(0);
  });

  it("weights per originator, not per repository — three repos by one person is one share", () => {
    const s = splitOriginatorShare(1_000_000, ["cato", "cato", " cato ", "ada"]);
    expect(Object.keys(s.payouts)).toEqual(["ada", "cato"]);
    expect(s.payouts.cato).toBe(50_000);
  });

  it("floors to whole satoshis and carries the remainder", () => {
    const s = splitOriginatorShare(1_000_001, ["a", "b", "c"]);
    expect(s.poolSats).toBe(100_000);
    expect(s.payouts).toEqual({ a: 33_333, b: 33_333, c: 33_333 });
    expect(s.carrySats).toBe(1);
  });

  it("holds a payout under the minimum in the pool instead of paying dust", () => {
    const s = splitOriginatorShare(50_000, ["a", "b"]); // pool 5_000, each 2_500 < 10_000
    expect(s.payouts).toEqual({});
    expect(s.carrySats).toBe(5_000);
  });

  it("with no originators the whole pool carries", () => {
    const s = splitOriginatorShare(1_000_000, []);
    expect(s.payouts).toEqual({});
    expect(s.carrySats).toBe(100_000);
  });

  it("zero revenue is a valid period with a zero ledger line", () => {
    expect(splitOriginatorShare(0, ["cato"])).toEqual({ poolSats: 0, payouts: {}, carrySats: 0 });
  });

  it("refuses non-integer or negative satoshis", () => {
    expect(() => splitOriginatorShare(1.5, ["a"])).toThrow();
    expect(() => splitOriginatorShare(-1, ["a"])).toThrow();
  });

  it("is order-independent: the same set of originators gives the same ledger", () => {
    const a = splitOriginatorShare(777_777, ["x", "y", "z"]);
    const b = splitOriginatorShare(777_777, ["z", "x", "y"]);
    expect(a).toEqual(b);
  });
});
