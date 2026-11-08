import { describe, expect, it } from "vitest";
import {
  CONSULT_RESEARCH,
  consultMessages,
  describeProposal,
  proposalContext,
  proposalSchema,
  type Proposal,
} from "../consult";
import type { Plan } from "../plan";

const ACT = { title: "Steuergesetz", authority: "li" };
const PROPOSAL: Proposal = {
  act: "0b8f1d2e-3c4a-4b5c-8d6e-7f8091a2b3c4",
  title: "A lower rate for small incomes",
  reason: "Small earners pay too much.",
  changes: [
    { op: "replace", heading: "Art. 19 Tarif", current: "1 % bis 8 %", proposed: "0 % bis 8 %" },
    { op: "repeal", heading: "Art. 20 Zuschlag", current: "Ein Zuschlag von 2 %.", proposed: "" },
    {
      op: "insert",
      heading: "Art. 19a Freibetrag",
      current: "",
      proposed: "CHF 20'000 sind frei.",
    },
  ],
};

const plan: Plan = {
  question: "What would a lower rate for small incomes do?",
  language: "English",
  authorities: ["li", "ch"],
  acts: [],
  groups: [],
  terms: [],
};

describe("a proposal the person is drafting", () => {
  it("reads as the act, each change with today's and the proposed words, and the reason", () => {
    const text = describeProposal(PROPOSAL, ACT);
    expect(text).toContain("Act: Steuergesetz (Liechtenstein)");
    expect(text).toContain(
      'Change 1: reword Art. 19 Tarif\nNow: """1 % bis 8 %"""\nProposed: """0 % bis 8 %"""',
    );
    // A repeal has no proposed words; an insertion has no current ones.
    expect(text).toContain('Change 2: repeal Art. 20 Zuschlag\nNow: """Ein Zuschlag von 2 %."""\n');
    expect(text).not.toContain('Proposed: """"""');
    expect(text).toContain('Change 3: insert a new article "Art. 19a Freibetrag"\nProposed:');
    expect(text).toContain('The person\'s reason: """Small earners pay too much."""');
  });

  it("tells the planner to search its own place and every other place for precedents", () => {
    const context = proposalContext(PROPOSAL, ACT);
    expect(context).toContain("Liechtenstein (li)");
    expect(context).toContain("every other place");
    expect(context).toContain("THE PROPOSAL");
  });

  it("asks the research step for evidence beyond the provisions", () => {
    expect(CONSULT_RESEARCH).toMatch(/studies/);
    expect(CONSULT_RESEARCH).toMatch(/other places' law/);
  });

  it("is bounded: an over-long draft or too many changes is refused before it reaches a prompt", () => {
    expect(proposalSchema.safeParse(PROPOSAL).success).toBe(true);
    expect(proposalSchema.safeParse({ ...PROPOSAL, reason: "x".repeat(3001) }).success).toBe(false);
    expect(
      proposalSchema.safeParse({ ...PROPOSAL, changes: Array(6).fill(PROPOSAL.changes[0]) })
        .success,
    ).toBe(false);
    expect(proposalSchema.safeParse({ ...PROPOSAL, act: "not-an-id" }).success).toBe(false);
  });
});

describe("the answer to a proposal", () => {
  const messages = consultMessages(
    [{ role: "user", content: "What would this do?" }],
    plan,
    [
      {
        actId: "a",
        authority: "ch",
        title: "DBG",
        systematicNumber: "642.11",
        path: "art_36",
        heading: "Art. 36 Steuersätze",
        lang: "de",
        excerpt: "",
        text: "Die Steuer beträgt…",
        inForceFrom: "2025-01-01",
        dateBasis: "publisher",
        sourceUrl: null,
        contentSha256: "",
        rank: 0,
      },
    ],
    [{ url: "https://www.example.org/study", title: "A study", text: "Findings." }],
    PROPOSAL,
    ACT,
  );
  const system = messages[0]!.content as string;

  it("weighs effects, who gains and who pays, and precedents, citing each with its handle", () => {
    expect(system).toMatch(/Who would gain and who would bear a cost/);
    expect(system).toMatch(/already law/);
    expect(system).toContain("[L1] Confederation — DBG (642.11)");
    expect(system).toContain("[W1] A study — https://www.example.org/study");
  });

  it("takes no side and invents nothing", () => {
    expect(system).toMatch(/Take no side/);
    expect(system).toMatch(/Never invent a study, a figure, a place or a law/);
  });

  it("carries the proposal and the conversation, in the person's language", () => {
    expect(system).toContain("THE PROPOSAL");
    expect(system).toContain("Write in English.");
    expect(messages.at(-1)).toEqual({ role: "user", content: "What would this do?" });
  });
});
