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
