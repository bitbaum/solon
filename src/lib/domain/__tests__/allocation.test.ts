import { describe, expect, it } from "vitest";
import { allocationMessage, generateKeyPair, signMessage, verifyMessage } from "@/lib/bitcoin/message";
import { DEFAULT_CONTRIBUTION_POLICY } from "@/lib/config/contribution";
import {
  canonicalSplit,
  contributionPolicySchema,
  evenSplit,
  parseContributionPolicy,
  splitHash,
  splitSatisfies,
  splitViolations,
  type ContributionPolicy,
  type ContributionTier,
} from "../allocation/policy";
import {
  aggregateAllocations,
  roundToWhole,
  standingOf,
  type MemberAllocation,
} from "../allocation/aggregate";

const TIERS: ContributionTier[] = DEFAULT_CONTRIBUTION_POLICY.tiers;

/** Bounds with a real federal floor — the interesting case for most rules. */
const BOUNDED: ContributionPolicy = {
  tiers: [
    { key: "local", label: "Local", minPercent: 10, maxPercent: 60 },
    { key: "state", label: "State", minPercent: 10, maxPercent: 50 },
    { key: "federal", label: "Federal", minPercent: 20, maxPercent: 70 },
  ],
  fallback: { local: 34, state: 33, federal: 33 },
};

const member = (weight: number, splits: MemberAllocation["splits"], id = `m-${weight}`) => ({
  memberId: id,
  weight,
  splits,
});

describe("the bounds a policy may express", () => {
  it("accepts the shipped default", () => {
    expect(contributionPolicySchema.safeParse(DEFAULT_CONTRIBUTION_POLICY).success).toBe(true);
  });

  /**
   * The refinements that matter. Each of these describes a policy under which
   * no member could file a valid split — a rule nobody can obey. Catching them
   * here means the failure lands on the proposal, while it is still an
   * argument between people, instead of on every member's declaration after
   * the vote has already enacted it.
   */
  it("rejects floors that together exceed a whole contribution", () => {
    const parsed = contributionPolicySchema.safeParse({
      tiers: [
        { key: "local", label: "Local", minPercent: 60, maxPercent: 100 },
        { key: "federal", label: "Federal", minPercent: 60, maxPercent: 100 },
      ],
      fallback: { local: 50, federal: 50 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects ceilings that together cannot fill one", () => {
    const parsed = contributionPolicySchema.safeParse({
      tiers: [
        { key: "local", label: "Local", minPercent: 0, maxPercent: 30 },
        { key: "federal", label: "Federal", minPercent: 0, maxPercent: 40 },
      ],
      fallback: { local: 30, federal: 40 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a fallback that violates the policy's own bounds", () => {
    const parsed = contributionPolicySchema.safeParse({
      ...BOUNDED,
      fallback: { local: 90, state: 5, federal: 5 }, // federal floor is 20
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a fallback that does not add up", () => {
    const parsed = contributionPolicySchema.safeParse({
      ...BOUNDED,
      fallback: { local: 30, state: 30, federal: 30 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a floor above its own ceiling, and duplicate tier keys", () => {
    expect(
      contributionPolicySchema.safeParse({
        tiers: [
          { key: "local", label: "Local", minPercent: 80, maxPercent: 20 },
          { key: "federal", label: "Federal", minPercent: 0, maxPercent: 100 },
        ],
        fallback: { local: 50, federal: 50 },
      }).success,
    ).toBe(false);

    expect(
      contributionPolicySchema.safeParse({
        tiers: [
          { key: "local", label: "Local", minPercent: 0, maxPercent: 100 },
          { key: "local", label: "Local again", minPercent: 0, maxPercent: 100 },
        ],
        fallback: { local: 100 },
      }).success,
    ).toBe(false);
  });

  it("needs at least two tiers — one tier is not a split", () => {
    expect(
      contributionPolicySchema.safeParse({
        tiers: [{ key: "federal", label: "Federal", minPercent: 100, maxPercent: 100 }],
        fallback: { federal: 100 },
      }).success,
    ).toBe(false);
  });

  it("returns null rather than a substitute when stored content is unusable", () => {
    expect(parseContributionPolicy({ tiers: "everything to the capital" })).toBeNull();
    expect(parseContributionPolicy(null)).toBeNull();
  });
});

describe("a split against the bounds in force", () => {
  it("accepts a split that adds to a hundred inside every bound", () => {
    expect(splitSatisfies({ local: 40, state: 35, federal: 25 }, BOUNDED.tiers)).toBe(true);
  });

  it("reports every problem at once, not the first one", () => {
    // Below the local floor, above the state ceiling, and short of 100.
    const problems = splitViolations({ local: 5, state: 60, federal: 20 }, BOUNDED.tiers);
    expect(problems).toHaveLength(3);
    expect(problems.join(" ")).toContain("floor");
    expect(problems.join(" ")).toContain("ceiling");
    expect(problems.join(" ")).toContain("85%");
  });

  /**
   * Silence is not zero. A member who omits a tier may mean "nothing there" or
   * may not have seen it, and defaulting the omission would turn it into a
   * signed statement they never made.
   */
  it("refuses a split that leaves a tier unstated", () => {
    expect(splitViolations({ local: 50, state: 50 }, BOUNDED.tiers)).toContain(
      "Federal is missing — state it explicitly, zero included",
    );
  });

  it("refuses a tier that is not in the policy", () => {
    const problems = splitViolations(
      { local: 30, state: 30, federal: 20, offshore: 20 },
      BOUNDED.tiers,
    );
    expect(problems.some((p) => p.includes("offshore"))).toBe(true);
  });

  it("refuses a split that adds to more than a whole contribution", () => {
    expect(splitSatisfies({ local: 60, state: 50, federal: 40 }, BOUNDED.tiers)).toBe(false);
  });

  it("lets a member direct nothing to a tier the policy does not floor", () => {
    expect(splitSatisfies({ local: 100, state: 0, federal: 0 }, TIERS)).toBe(true);
  });
});

describe("the signed encoding of a split", () => {
  it("is stable under key order, so the same intent always signs identically", () => {
    expect(canonicalSplit({ state: 35, federal: 25, local: 40 })).toBe(
      canonicalSplit({ local: 40, state: 35, federal: 25 }),
    );
    expect(canonicalSplit({ local: 40, state: 35, federal: 25 })).toBe(
      "federal=25,local=40,state=35",
    );
  });

  /**
   * Unlike a dot ballot, zeros survive canonicalisation. Directing nothing to a
   * tier is a position — often the whole reason for declaring — and dropping it
   * would let "nothing to federal" and "forgot about federal" sign the same text.
   */
  it("keeps a zero, because a zero is a position", () => {
    expect(canonicalSplit({ local: 100, state: 0, federal: 0 })).toBe(
      "federal=0,local=100,state=0",
    );
    expect(canonicalSplit({ local: 100, state: 0, federal: 0 })).not.toBe(
      canonicalSplit({ local: 100 }),
    );
  });

  it("signs differently for every different split", () => {
    expect(splitHash({ local: 40, state: 35, federal: 25 })).not.toBe(
      splitHash({ local: 35, state: 40, federal: 25 }),
    );
  });

  /**
   * The replay this closes: a split signed when a tier could take everything,
   * re-submitted after a vote capped that tier, would otherwise read as consent
   * to bounds the member never saw.
   */
  it("binds the policy version, so consent cannot be replayed under new bounds", () => {
    const common = {
      orgSlug: "solon",
      memberAddress: "addr-1",
      split: "federal=25,local=40,state=35",
      hash: "abc",
    };
    expect(allocationMessage({ ...common, policyVersion: 1 })).not.toBe(
      allocationMessage({ ...common, policyVersion: 2 }),
    );
    expect(allocationMessage({ ...common, policyVersion: null })).toContain("policy:default");
  });

  it("verifies end to end against a real Bitcoin key", () => {
    const key = generateKeyPair();
    const splits = { local: 40, state: 35, federal: 25 };
    const message = allocationMessage({
      orgSlug: "solon",
      memberAddress: key.address,
      policyVersion: 1,
      split: canonicalSplit(splits),
      hash: splitHash(splits),
    });

    const signature = signMessage(message, key.privateKeyHex);
    expect(verifyMessage(message, key.address, signature).valid).toBe(true);

    // One point moved between two tiers and the signature no longer stands.
    const tampered = allocationMessage({
      orgSlug: "solon",
      memberAddress: key.address,
      policyVersion: 1,
      split: canonicalSplit({ local: 41, state: 34, federal: 25 }),
      hash: splitHash({ local: 41, state: 34, federal: 25 }),
    });
    expect(verifyMessage(tampered, key.address, signature).valid).toBe(false);
  });
});

describe("the split a form opens on", () => {
  it("is valid under the policy it was built for", () => {
    for (const policy of [DEFAULT_CONTRIBUTION_POLICY, BOUNDED]) {
      const start = evenSplit(policy.tiers);
      expect(start).not.toBeNull();
      expect(splitViolations(start!, policy.tiers)).toEqual([]);
    }
  });

  it("honours floors before spreading what is left", () => {
    const start = evenSplit([
      { key: "local", label: "Local", minPercent: 0, maxPercent: 20 },
      { key: "federal", label: "Federal", minPercent: 80, maxPercent: 100 },
    ])!;
    expect(start.federal).toBeGreaterThanOrEqual(80);
    expect(start.local + start.federal).toBe(100);
  });
});

describe("the organization's effective split", () => {
  it("counts a member at what they declared, weighted", () => {
    const result = aggregateAllocations(
      [
        member(1, { local: 100, state: 0, federal: 0 }, "a"),
        member(3, { local: 0, state: 0, federal: 100 }, "b"),
      ],
      DEFAULT_CONTRIBUTION_POLICY,
    );
    expect(result.tiers.find((t) => t.key === "local")!.percent).toBe(25);
    expect(result.tiers.find((t) => t.key === "federal")!.percent).toBe(75);
    expect(result.declaredWeightPercent).toBe(100);
  });

  /**
   * The flattering number would be to average only the members who spoke.
   * Contributions follow the fallback for everyone who did not, so the
   * headline has to include them — and say how many they were.
   */
  it("counts silence at the published fallback, and says how much of it there was", () => {
    const result = aggregateAllocations(
      [
        member(1, { local: 100, state: 0, federal: 0 }, "a"),
        member(1, null, "b"),
        member(2, null, "c"),
      ],
      DEFAULT_CONTRIBUTION_POLICY,
    );
    // 1 × 100 + 3 × 34 (the fallback's local share), over weight 4.
    expect(result.tiers.find((t) => t.key === "local")!.percent).toBe(50.5);
    expect(result.counts).toMatchObject({ members: 3, declared: 1, undeclared: 2 });
    expect(result.declaredWeightPercent).toBe(25);
  });

  it("separates what people chose from what currently applies", () => {
    const result = aggregateAllocations(
      [member(1, { local: 100, state: 0, federal: 0 }, "a"), member(1, null, "b")],
      DEFAULT_CONTRIBUTION_POLICY,
    );
    const local = result.tiers.find((t) => t.key === "local")!;
    expect(local.declaredPercent).toBe(100); // the only person who spoke
    expect(local.percent).toBe(67); // what contributions actually follow
  });

  it("reports no declared share at all when nobody has declared", () => {
    const result = aggregateAllocations(
      [member(1, null, "a")],
      DEFAULT_CONTRIBUTION_POLICY,
    );
    expect(result.tiers.every((t) => t.declaredPercent === null)).toBe(true);
    expect(result.declaredWeightPercent).toBe(0);
  });

  it("falls back to the published split when there is no one to average", () => {
    const result = aggregateAllocations([], DEFAULT_CONTRIBUTION_POLICY);
    expect(result.tiers.map((t) => t.displayPercent)).toEqual([34, 33, 33]);
    expect(result.counts.members).toBe(0);
  });

  /**
   * When a vote narrows the bounds, a split signed under the old ones can stop
   * fitting. Solon will not clamp it: the number they signed is the only number
   * they asserted, and a clamped version would be a statement they never made
   * still carrying their signature. It stops counting instead, and the member
   * falls to the fallback until they sign under the rules that now apply.
   */
  it("stops counting a split the bounds no longer admit, rather than clamping it", () => {
    const stale = { local: 100, state: 0, federal: 0 }; // BOUNDED floors federal at 20
    expect(standingOf(member(1, stale), BOUNDED.tiers)).toBe("out_of_bounds");

    const result = aggregateAllocations([member(1, stale)], BOUNDED);
    expect(result.counts.outOfBounds).toBe(1);
    expect(result.declaredWeightPercent).toBe(0);
    // Counted at the fallback — not at 100 local, and not clamped to 80/0/20.
    expect(result.tiers.find((t) => t.key === "local")!.percent).toBe(34);
  });

  it("displays whole points that add up to a hundred", () => {
    // Three-way even split: 33.33… each, which rounds to 99 if done naively.
    const result = aggregateAllocations(
      [
        member(1, { local: 100, state: 0, federal: 0 }, "a"),
        member(1, { local: 0, state: 100, federal: 0 }, "b"),
        member(1, { local: 0, state: 0, federal: 100 }, "c"),
      ],
      DEFAULT_CONTRIBUTION_POLICY,
    );
    expect(result.tiers.reduce((s, t) => s + t.displayPercent, 0)).toBe(100);
  });

  it("hands spare points to the largest remainders, deterministically", () => {
    const rounded = roundToWhole([
      { key: "local", percent: 33.4 },
      { key: "state", percent: 33.3 },
      { key: "federal", percent: 33.3 },
    ]);
    expect(rounded.get("local")).toBe(34);
    expect([...rounded.values()].reduce((s, n) => s + n, 0)).toBe(100);

    // Two tiers tie for one spare point. It goes to the lower key, so the same
    // input always renders identically rather than following object order.
    const tied = roundToWhole([
      { key: "state", percent: 33.5 },
      { key: "local", percent: 33.5 },
      { key: "federal", percent: 33 },
    ]);
    expect(tied.get("local")).toBe(34);
    expect(tied.get("state")).toBe(33);
    expect([...tied.values()].reduce((s, n) => s + n, 0)).toBe(100);
  });
});
