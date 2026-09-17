import { DEFAULT_DOT_BUDGET } from "@/lib/domain/methods";
import type { BallotOption, WeightedBallot } from "@/lib/domain/methods/types";

/**
 * The worked examples behind /governance — the teaching half of the site.
 *
 * Two rules govern this file, and both exist so the lesson cannot become a lie.
 *
 * FIRST: nothing here counts anything. Every tally on those pages is produced by
 * `methodSpec(id).aggregate(...)` — the same function that counts a real
 * session. This module only supplies ballots. If Solon's counting changes, the
 * teaching pages change with it, because there is no second implementation to
 * drift. That is the whole reason the examples are worth showing.
 *
 * SECOND: one roster, one set of preferences, many questions. A reader is being
 * told that the METHOD changes the outcome, not the voters — so the voters must
 * demonstrably not change. Each member states how much they want each option,
 * once, and every ballot shape is DERIVED from that by `ballotsFor()`. Hand-
 * writing six ballot sets would let the demonstration cheat, and nobody reading
 * the page could tell.
 *
 * The scenario is deliberately generic — a shared fund, a roof, an
 * apprenticeship. It names no organization, ours or anyone else's: a reader is
 * meant to map it onto their own, and a branded example would also read as a
 * claim that the named body governs here.
 */

/** A member's stated appetite for each option, 0–5. Everything derives from this. */
export interface Preference {
  /** Display label. Members are groups of like-minded voters, not real people. */
  label: string;
  /** How many members hold this preference. Each carries voting weight 1. */
  count: number;
  /** 0 = would not fund it, 5 = top priority. */
  ratings: Readonly<Record<string, number>>;
}

export const FUND_OPTIONS: readonly BallotOption[] = [
  { key: "roof", label: "Repair the roof" },
  { key: "apprenticeship", label: "Fund the apprenticeship" },
  { key: "tooling", label: "Buy the tooling" },
  { key: "reserve", label: "Hold in reserve" },
] as const;

export const FUND_QUESTION = "How should the shared fund be spent this quarter?";

/**
 * Seven members in three camps. The camps are built so the methods genuinely
 * disagree — the roof is the most-wanted FIRST choice and the tooling is the
 * most widely acceptable one, which is the oldest split in voting theory and
 * the reason a tool that only knows "pick one" quietly decides things for you.
 */
export const FUND_PREFERENCES: readonly Preference[] = [
  {
    label: "Three members who use the building daily",
    count: 3,
    ratings: { roof: 5, tooling: 2, reserve: 1, apprenticeship: 0 },
  },
  {
    label: "Two members who train newcomers",
    count: 2,
    ratings: { apprenticeship: 5, tooling: 4, reserve: 1, roof: 0 },
  },
  {
    label: "Two members who do the work itself",
    count: 2,
    ratings: { tooling: 5, apprenticeship: 2, reserve: 1, roof: 0 },
  },
] as const;

/** Options this member rated above zero, best first. Ties break on option order. */
function rankingFor(ratings: Readonly<Record<string, number>>): string[] {
  return FUND_OPTIONS.map((o) => o.key)
    .filter((key) => (ratings[key] ?? 0) > 0)
    .sort((a, b) => (ratings[b] ?? 0) - (ratings[a] ?? 0));
}

/**
 * Spend exactly the dot budget in proportion to the ratings, by largest
 * remainder — the same rule used to apportion seats, and the only honest way to
 * turn a rating into a fixed number of dots without quietly rounding a
 * preference away.
 */
function dotsFor(ratings: Readonly<Record<string, number>>): Record<string, number> {
  const keys = FUND_OPTIONS.map((o) => o.key).filter((k) => (ratings[k] ?? 0) > 0);
  const total = keys.reduce((s, k) => s + (ratings[k] ?? 0), 0);
  if (total === 0) return {};

  const exact = keys.map((k) => ((ratings[k] ?? 0) / total) * DEFAULT_DOT_BUDGET);
  const floors = exact.map((n) => Math.floor(n));
  let left = DEFAULT_DOT_BUDGET - floors.reduce((s, n) => s + n, 0);

  const order = keys
    .map((k, i) => ({ i, remainder: exact[i] - floors[i] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }

  const out: Record<string, number> = {};
  keys.forEach((k, i) => {
    if (floors[i] > 0) out[k] = floors[i];
  });
  return out;
}

/** An option is approved when its owner rated it at least this. */
export const APPROVAL_FLOOR = 3;

/**
 * The same preferences, expressed as the ballot each ranking method asks for.
 *
 * Every shape here is validated against the method's own `schema()` in
 * `worked-example.test.ts`, so a derivation that produced something Solon would
 * reject at the door can never reach a teaching page.
 */
export function ballotsFor(method: "approval" | "dot" | "score" | "ranked"): WeightedBallot[] {
  const out: WeightedBallot[] = [];
  for (const camp of FUND_PREFERENCES) {
    const { ratings } = camp;
    let ballot: unknown;
    if (method === "ranked") ballot = { ranking: rankingFor(ratings) };
    else if (method === "dot") ballot = { allocations: dotsFor(ratings) };
    else if (method === "score") ballot = { scores: { ...ratings } };
    else {
      ballot = {
        approved: FUND_OPTIONS.map((o) => o.key).filter((k) => (ratings[k] ?? 0) >= APPROVAL_FLOOR),
      };
    }
    // One ballot per member, not one per camp weighted by its size: weight is a
    // separate governance question, and folding a headcount into it here would
    // teach the wrong thing about what `weight` means.
    for (let i = 0; i < camp.count; i += 1) out.push({ ballot, weight: 1 });
  }
  return out;
}

/**
 * First preferences — what a "pick one" ballot would have collected from the
 * same room. Not a Solon method: plurality is the thing the six methods exist
 * to improve on, so it is computed here, named as the outsider it is, and never
 * offered as something an organization can choose.
 */
export function firstPreferenceCounts(): { key: string; label: string; count: number }[] {
  const counts = new Map(FUND_OPTIONS.map((o) => [o.key, 0]));
  for (const camp of FUND_PREFERENCES) {
    const top = rankingFor(camp.ratings)[0];
    if (top) counts.set(top, (counts.get(top) ?? 0) + camp.count);
  }
  return FUND_OPTIONS.map((o) => ({
    key: o.key,
    label: o.label,
    count: counts.get(o.key) ?? 0,
  })).sort((a, b) => b.count - a.count);
}

export const TOTAL_MEMBERS = FUND_PREFERENCES.reduce((s, c) => s + c.count, 0);

/* ───────────────────────────── the objection ─────────────────────────────── */

export const CONSENT_QUESTION = "Sign the roof contract at the quoted price.";

/**
 * The second example: the same seven members, one yes/no question, counted two
 * ways. Five agree and two object, so a majority passes it and consent does
 * not — which is not consent being obstructive but consent asking a different
 * question. The objections carry their reasons because that is what a group
 * has to resolve; a "no" carries nothing to resolve.
 */
export const OBJECTIONS: readonly { rationale: string; count: number }[] = [
  {
    rationale:
      "The quote is a year old and the contractor has not re-surveyed the roof since the storm.",
    count: 1,
  },
  {
    rationale: "Signing this quarter spends the reserve we agreed to hold until the audit closes.",
    count: 1,
  },
] as const;

export const AGREE_COUNT = TOTAL_MEMBERS - OBJECTIONS.reduce((s, o) => s + o.count, 0);

export function consentBallots(): WeightedBallot[] {
  const out: WeightedBallot[] = [];
  for (let i = 0; i < AGREE_COUNT; i += 1) {
    out.push({ ballot: { response: "agree" }, weight: 1 });
  }
  for (const o of OBJECTIONS) {
    for (let i = 0; i < o.count; i += 1) {
      out.push({ ballot: { response: "object", rationale: o.rationale }, weight: 1 });
    }
  }
  return out;
}

/** The identical room, asked yes or no. */
export function singleChoiceBallots(): WeightedBallot[] {
  const out: WeightedBallot[] = [];
  for (let i = 0; i < AGREE_COUNT; i += 1) out.push({ ballot: { choice: "yes" }, weight: 1 });
  for (const o of OBJECTIONS) {
    for (let i = 0; i < o.count; i += 1) out.push({ ballot: { choice: "no" }, weight: 1 });
  }
  return out;
}

/* ────────────────────────────── the paradox ──────────────────────────────── */

export const CYCLE_OPTIONS: readonly BallotOption[] = [
  { key: "hall", label: "The hall" },
  { key: "yard", label: "The yard" },
  { key: "kitchen", label: "The kitchen" },
] as const;

export const CYCLE_QUESTION = "Which space do we renovate first?";

/**
 * Condorcet's paradox, 1785: three members, three options, and a majority for
 * every possible answer over some other answer — in a circle.
 *
 * The hall beats the yard two to one. The yard beats the kitchen two to one.
 * The kitchen beats the hall two to one. There is no option a majority prefers
 * to all others, so "what the majority wants" is not a question with an answer
 * here. It is not a tie and not a bug: a group can hold preferences no single
 * winner satisfies, and Solon's `condorcetKey` returns null to say exactly that
 * rather than pretending otherwise.
 */
export const CYCLE_RANKINGS: readonly string[][] = [
  ["hall", "yard", "kitchen"],
  ["yard", "kitchen", "hall"],
  ["kitchen", "hall", "yard"],
] as const;

export function cycleBallots(): WeightedBallot[] {
  return CYCLE_RANKINGS.map((ranking) => ({ ballot: { ranking: [...ranking] }, weight: 1 }));
}

/** The three head-to-head races, for the diagram. Derived, never typed out. */
export function cyclePairs(): { winner: string; loser: string; for: number; against: number }[] {
  const keys = CYCLE_OPTIONS.map((o) => o.key);
  const pairs: { winner: string; loser: string; for: number; against: number }[] = [];
  for (const a of keys) {
    for (const b of keys) {
      if (a >= b) continue;
      let aWins = 0;
      for (const ranking of CYCLE_RANKINGS) {
        if (ranking.indexOf(a) < ranking.indexOf(b)) aWins += 1;
      }
      const bWins = CYCLE_RANKINGS.length - aWins;
      pairs.push(
        aWins >= bWins
          ? { winner: a, loser: b, for: aWins, against: bWins }
          : { winner: b, loser: a, for: bWins, against: aWins },
      );
    }
  }
  return pairs;
}

export function labelFor(options: readonly BallotOption[], key: string | null | undefined): string {
  return options.find((o) => o.key === key)?.label ?? "—";
}
