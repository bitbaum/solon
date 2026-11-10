/**
 * Contested places, compared question by question (design:
 * docs/design/2026-11-contested-law.md). The shape of the config and the
 * checks it must pass; the data is in `src/lib/config/places/contested.ts`.
 * No country is named here: a contest names its place and sides by the world
 * list's slugs and the law register's keys.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";
import { actRefSchema, wordingSchema } from "@/lib/statistics/records";

/** How a side stands to the place: it governs it, or it claims it (`world.ts`, `claimedBy`). */
export const CONTEST_ROLES = ["governs", "claims"] as const;
export type ContestRole = (typeof CONTEST_ROLES)[number];

const keySchema = z.string().regex(/^[a-z][a-z0-9_]*$/, "lower snake case");

export const contestTopicSchema = z.object({
  key: keySchema,
  label: localizedTextSchema,
  /** The question asked of every side's text, the same for every place. */
  question: localizedTextSchema,
});
export type ContestTopic = z.infer<typeof contestTopicSchema>;

export const contestProvisionSchema = z.object({
  topic: keySchema,
  side: keySchema,
  /** How the text names the article: "Constitution, Art. 3". */
  label: z.string().min(1),
  /** The act in Solon's law register, when it holds it; null when Solon does not hold that side's law yet. */
  act: actRefSchema.nullable(),
  /** The publisher's anchor of the article in the held act (`art_3`). */
  provision: z.string().min(1).nullable(),
  /** The words, in the language they were read in, with a translation and the page. */
  quote: wordingSchema,
  /** Who translated the words quoted, when the quoted text is itself a translation of the law. */
  translator: z.string().min(1).optional(),
});
export type ContestProvision = z.infer<typeof contestProvisionSchema>;

/**
 * What one side's public budget rested on in one year, as its own budget law
 * states it: every revenue line counted, each marked as raised by the side
 * itself or received from someone else, and what was spent. Amounts are in the
 * law's own unit (`unit`: 1000 for "тыс. рублей").
 */
export const contestLedgerSchema = z.object({
  side: keySchema,
  year: z.number().int().min(1900),
  currency: z.string().regex(/^[A-Z]{3}$/),
  unit: z.number().positive(),
  revenue: z.number().positive(),
  expenditure: z.number().positive(),
  lines: z
    .array(
      z.object({
        label: localizedTextSchema,
        amount: z.number().min(0),
        /** Raised by the side itself (taxes, fees, its own income), or received from another. */
        kind: z.enum(["own", "received"]),
        /** Who gave it, for a line received: a name that stands alone as a label. */
        from: localizedTextSchema.optional(),
      }),
    )
    .min(1),
  /** The law's words that state the totals, and where the lines were read. */
  quote: wordingSchema,
  label: z.string().min(1),
  act: actRefSchema.nullable(),
});
export type ContestLedger = z.infer<typeof contestLedgerSchema>;

export const contestSchema = z.object({
  /** The place's slug in the world list (`src/lib/config/world.ts`). */
  place: z.string().min(1),
  /** Who governs it and who claims it; the order is the order on the page, by role. */
  sides: z
    .array(
      z.object({
        key: keySchema,
        role: z.enum(CONTEST_ROLES),
        /** The law register's authority key, when Solon holds that side's law. */
        lawAuthority: z.string().min(1).nullable(),
      }),
    )
    .min(2),
  provisions: z.array(contestProvisionSchema).default([]),
  /** Each side's public money, from its own budget laws. */
  ledgers: z.array(contestLedgerSchema).default([]),
  /** What the comparison leaves open, and what would fill it. */
  open: localizedTextSchema.optional(),
});
export type Contest = z.infer<typeof contestSchema>;
export type ContestInput = z.input<typeof contestSchema>;

export function defineContestTopics(input: readonly z.input<typeof contestTopicSchema>[]) {
  const topics = input.map((t) => contestTopicSchema.parse(t));
  const seen = new Set<string>();
  for (const t of topics) {
    if (seen.has(t.key)) throw new Error(`contest topic "${t.key}" is declared twice`);
    seen.add(t.key);
  }
  return topics;
}

/** Problems with the contests against the topics; empty when they are sound. */
export function contestProblems(
  topics: readonly ContestTopic[],
  contests: readonly Contest[],
): string[] {
  const problems: string[] = [];
  const topicKeys = new Set(topics.map((t) => t.key));
  const places = new Set<string>();
  for (const c of contests) {
    if (places.has(c.place)) problems.push(`contest "${c.place}" is declared twice`);
    places.add(c.place);
    const sideKeys = c.sides.map((s) => s.key);
    if (new Set(sideKeys).size !== sideKeys.length) {
      problems.push(`contest "${c.place}": a side is declared twice`);
    }
    if (c.sides.filter((s) => s.role === "governs").length !== 1) {
      problems.push(`contest "${c.place}": exactly one side governs the place`);
    }
    // Fixed order by role, never by preference: the side that governs first, then each claimant.
    const firstClaim = c.sides.findIndex((s) => s.role === "claims");
    const governs = c.sides.findIndex((s) => s.role === "governs");
    if (firstClaim >= 0 && governs > firstClaim) {
      problems.push(`contest "${c.place}": the side that governs comes first`);
    }
    for (const p of c.provisions) {
      if (!topicKeys.has(p.topic)) {
        problems.push(`contest "${c.place}": topic "${p.topic}" does not exist`);
      }
      const side = c.sides.find((s) => s.key === p.side);
      if (!side) {
        problems.push(`contest "${c.place}": side "${p.side}" does not exist`);
        continue;
      }
      if (p.act && p.act.authority !== side.lawAuthority) {
        problems.push(
          `contest "${c.place}": "${p.label}" cites an act of "${p.act.authority}", not of its side's authority`,
        );
      }
      if (p.provision && !p.act) {
        problems.push(`contest "${c.place}": "${p.label}" names an article but no act`);
      }
      if (p.quote.lang !== "en" && !p.quote.translation?.en) {
        problems.push(
          `contest "${c.place}": "${p.label}" is quoted without an English translation`,
        );
      }
    }
    for (const l of c.ledgers) {
      const side = c.sides.find((s) => s.key === l.side);
      if (!side) problems.push(`contest "${c.place}": ledger side "${l.side}" does not exist`);
      if (l.act && l.act.authority !== side?.lawAuthority) {
        problems.push(`contest "${c.place}": ledger ${l.year} cites an act of another authority`);
      }
      const counted = l.lines.reduce((n, line) => n + line.amount, 0);
      // The law rounds its total; the lines must add up to it within one of its units.
      if (Math.abs(counted - l.revenue) > 1) {
        problems.push(
          `contest "${c.place}": ledger ${l.year} lines add up to ${counted}, not the stated revenue ${l.revenue}`,
        );
      }
      if (l.lines.some((line) => line.kind === "received" && !line.from)) {
        problems.push(`contest "${c.place}": ledger ${l.year} has money received from no one`);
      }
      if (l.quote.lang !== "en" && !l.quote.translation?.en) {
        problems.push(
          `contest "${c.place}": ledger ${l.year} is quoted without an English translation`,
        );
      }
    }
  }
  return problems;
}

export function defineContests(
  topics: readonly ContestTopic[],
  input: readonly ContestInput[],
): Contest[] {
  const contests = input.map((c) => contestSchema.parse(c));
  const problems = contestProblems(topics, contests);
  if (problems.length > 0) throw new Error(`contested places:\n- ${problems.join("\n- ")}`);
  return contests;
}

/**
 * What a ledger's own figures say, by arithmetic alone: what share of spending
 * the side raised itself, and what covering the same spending without the
 * money received would take. Not a forecast: a person can grow or shrink an
 * economy, a budget cannot be read for that, and the page says so.
 */
export function ledgerArithmetic(l: ContestLedger) {
  const own = l.lines.filter((x) => x.kind === "own").reduce((n, x) => n + x.amount, 0);
  const received = l.revenue - own;
  return {
    own,
    received,
    /** Of all revenue, the share received from others. */
    receivedShare: received / l.revenue,
    /** Of what was spent, the share the side's own revenue covered. */
    ownCoverage: own / l.expenditure,
    /** How many times its own revenue would have to grow to cover the same spending alone. */
    ownMultipleNeeded: own > 0 ? l.expenditure / own : null,
    /** By what share spending would have to fall to be covered by its own revenue alone. */
    spendingCutNeeded: Math.max(0, 1 - own / l.expenditure),
  };
}
