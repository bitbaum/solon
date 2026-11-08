/**
 * Thinking a proposed change through with the assistant (design:
 * docs/design/2026-11-global-law-and-exit.md, "AI helps the citizen act").
 * The person drafting a change asks what it would do, who would gain and who
 * would bear the cost, and where something like it is already law. The same
 * engine as a question about the law (plan, search, research, write), told
 * what is being changed, looking for the same subject in other places' law,
 * and for evidence on the web: studies, evaluations, the experience of places
 * that did it. The proposal stays the person's: the assistant informs it and
 * may suggest wording, but never files anything.
 */
import type { ChatMessage } from "@bitbaum/ai-kit";
import { REPLIES_INSTRUCTION } from "@bitbaum/chatkit";
import { z } from "zod";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import type { ProvisionHit } from "@/lib/law/search";
import type { Plan, Turn } from "./plan";
import type { WebSource } from "./research";

/** What the person is proposing, as the amend form holds it. Bounded: it reaches a prompt. */
export const proposalSchema = z.object({
  /** The act's id; its title and authority are read from the database, never taken from the browser. */
  act: z.string().uuid(),
  title: z.string().max(300).optional(),
  reason: z.string().max(3000).optional(),
  changes: z
    .array(
      z.object({
        op: z.enum(["replace", "repeal", "insert"]),
        heading: z.string().max(300),
        current: z.string().max(4000),
        proposed: z.string().max(4000),
      }),
    )
    .max(5),
});
export type Proposal = z.infer<typeof proposalSchema>;

/** The act as the database knows it. */
export interface ProposalAct {
  title: string;
  authority: string;
}

const authorityName = (key: string) => LAW_AUTHORITIES.find((a) => a.key === key)?.name ?? key;

/** The proposal as text: the act, each change with its current and proposed words, the reason. */
export function describeProposal(proposal: Proposal, act: ProposalAct): string {
  const changes = proposal.changes
    .map((c, i) => {
      const what =
        c.op === "repeal"
          ? `repeal ${c.heading}`
          : c.op === "insert"
            ? `insert a new article "${c.heading}"`
            : `reword ${c.heading}`;
      const current = c.op === "insert" ? "" : `\nNow: """${c.current}"""`;
      const proposed = c.op === "repeal" ? "" : `\nProposed: """${c.proposed}"""`;
      return `Change ${i + 1}: ${what}${current}${proposed}`;
    })
    .join("\n\n");
  return [
    `Act: ${act.title} (${authorityName(act.authority)})`,
    proposal.title ? `The proposal's title: ${proposal.title}` : "",
    changes || "(no change written yet)",
    proposal.reason ? `The person's reason: """${proposal.reason}"""` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** What the planner is told besides the conversation. */
export function proposalContext(proposal: Proposal, act: ProposalAct): string {
  return `\n\nThe person is drafting a change to the law and wants to think it through. Search ${authorityName(act.authority)} (${act.authority}) for the act being changed and the provisions around it. Then, for precedents, add the places most likely to regulate the same subject in comparable terms: the levels above and beside it in the same country (its country, its canton or state, other communes), and neighbouring cantons and countries with similar law. Up to eight places, nearest first; a far place only when it is known for this very rule.\n\nTHE PROPOSAL\n${describeProposal(proposal, act)}`;
}

/** What the research step is told to look for, beyond the provisions. */
export const CONSULT_RESEARCH = `This is a proposed change to the law, not a question about what the law is. Besides the provisions, look for evidence on what such a change does: the same rule in other places' law (search their law in its own language), and, on the web, studies, official evaluations and reports of places that made a similar change and what followed. Prefer primary sources (statistics offices, peer-reviewed studies, official evaluations) over opinion.`;

const instructions = (
  language: string,
  places: string,
) => `You help a person think through a change they are proposing to the law. You are given their proposal, the provisions found (handles like [L1], from ${places}) and web pages (handles like [W1]).

Answer what they ask. When they ask in general, cover, in this order and briefly:
1. What it changes: the rule today and the rule after, in plain words, citing the provision being changed.
2. What would likely follow: the direct effects, then the plausible indirect ones. Say how sure each is.
3. Who would gain and who would bear a cost: name the groups, without taking a side.
4. Where something like it is already law: other places' provisions found here (cite them), and places the web pages describe, with what is known of how it went (cite them).
5. What is not known, and what evidence would settle it.
6. If it helps, how the wording could be clearer or harder to misread, as a suggestion they may take or leave.

Rules:
- Cite every factual statement with its handle in square brackets: "[L2]" or "[W1, W3]". A claim with no source says so plainly ("no source found here").
- Never invent a study, a figure, a place or a law. If the sources do not cover something, say so.
- Likely effects with no source are your reasoning: say "likely because…" and give the reason. Never write that something "has shown", "was observed" or "happened elsewhere" without a handle for it.
- Take no side on whether the change is good. Lay out the effects and the trade-offs; the person decides.
- Do not draft a whole new proposal unless asked; the proposal is theirs.
- Write in ${language}, the quick replies included.`;

/** The messages that write the answer. */
export function consultMessages(
  turns: readonly Turn[],
  plan: Plan,
  hits: readonly ProvisionHit[],
  web: readonly WebSource[],
  proposal: Proposal,
  act: ProposalAct,
): ChatMessage[] {
  const sources = hits
    .map(
      (hit, i) =>
        `[L${i + 1}] ${authorityName(hit.authority)} — ${hit.title ?? ""} (${hit.systematicNumber ?? "no number"})\n${hit.heading}\n${hit.text}`,
    )
    .join("\n\n");
  const pages = web
    .map((page, i) => `[W${i + 1}] ${page.title} — ${page.url}\n${page.text.slice(0, 3000)}`)
    .join("\n\n");
  const places = [...new Set(hits.map((h) => authorityName(h.authority)))].join(", ") || "none";
  const system = `${instructions(plan.language, places)}\n\n${REPLIES_INSTRUCTION}\n\nTHE PROPOSAL\n${describeProposal(proposal, act)}\n\nPROVISIONS\n${sources || "(none found)"}${pages ? `\n\nWEB PAGES\n${pages}` : ""}`;
  return [{ role: "system", content: system }, ...turns.slice(-8)];
}
