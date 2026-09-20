import { describe, expect, it } from "vitest";
import { generateKeyPair, proposalMessage, signMessage, voteMessage } from "@/lib/bitcoin/message";
import { DecisionCategory, SessionOutcome } from "@/lib/db/enums";
import type { DecisionDocument } from "@/lib/domain/decision";
import {
  assessDecision,
  decisionTrailers,
  ratificationHref,
  report,
  touchesConstitution,
} from "../ratification";

describe("decisionTrailers", () => {
  it("reads `Decision: <id>` anywhere in a message, case-insensitively, deduplicated", () => {
    const messages = [
      "fix(governance): raise operations quorum\n\nDecision: sess-1\nCo-Authored-By: x",
      "chore: typo\n\ndecision:   sess-1  ",
      "feat: another\n\nDECISION: sess-2",
      "no trailer here\nDecision without colon",
    ];
    expect(decisionTrailers(messages)).toEqual(["sess-1", "sess-2"]);
  });

  it("ignores a decision mentioned mid-sentence — only a trailer line is a claim", () => {
    expect(decisionTrailers(["see Decision: sess-9 for context"])).toEqual([]);
  });
});

describe("touchesConstitution", () => {
  it("is exactly the file that says it is a rules matter", () => {
    expect(touchesConstitution(["src/lib/config/governance.ts"])).toBe(true);
    expect(touchesConstitution(["src/lib/config/governance-profiles.ts", "README.md"])).toBe(false);
  });
});

// A decision document built the way Solon builds one: real keys, real
// signatures over the canonical messages. The assessment must recompute, so
// the fixture has to be genuinely verifiable — a hand-typed signature would
// only prove the test agrees with itself.
function signedDecision(overrides: {
  category?: DecisionCategory;
  outcome?: SessionOutcome;
  tamperVote?: boolean;
  tamperProposer?: boolean;
}): DecisionDocument {
  const proposerKey = generateKeyPair();
  const voterKey = generateKeyPair();
  const category = overrides.category ?? DecisionCategory.GOVERNANCE_RULES;
  const sessionId = "11111111-1111-4111-8111-111111111111";
  const msg = proposalMessage({
    orgSlug: "bitbaum",
    category,
    title: "Ratify: raise quorum",
    proposerAddress: proposerKey.address,
  });
  const vMsg = voteMessage({ sessionId, choice: "yes", memberAddress: voterKey.address });
  const proposerSig = signMessage(msg, proposerKey.privateKeyHex);
  const voteSig = signMessage(vMsg, voterKey.privateKeyHex);
  return {
    decision_id: sessionId,
    organization: { id: "o", slug: "bitbaum", name: "Bitbaum" },
    proposal: {
      id: "p",
      category,
      title: "Ratify: raise quorum",
      body: "",
      policyKey: null,
      proposedContent: null,
      target: null,
      contentHash: null,
      proposer: {
        id: "m1",
        displayName: "Cato",
        memberType: "HUMAN",
        bitcoinAddress: proposerKey.address,
        publicKeyHex: proposerKey.publicKeyHex,
      },
      proposerMessage: overrides.tamperProposer ? msg.replace("raise", "lower") : msg,
      proposerSignature: proposerSig,
    },
    rules: {
      electorate: "HUMANS_ONLY",
      method: "CONSENT",
      options: null,
      dotBudget: null,
      threshold: "SUPERMAJORITY",
      quorumPercent: 60,
      eligibleCount: 1,
      eligibleWeight: 1,
      opensAt: new Date(0),
      closesAt: new Date(1),
    },
    votes: [
      {
        member: {
          id: "m2",
          displayName: "Mao",
          memberType: "HUMAN",
          bitcoinAddress: voterKey.address,
          publicKeyHex: voterKey.publicKeyHex,
        },
        ballot: "yes",
        weight: 1,
        signedMessage: overrides.tamperVote ? vMsg.replace("yes", "no") : vMsg,
        signature: voteSig,
        castAt: new Date(1),
      },
    ],
    aggregate: { yes: 1, no: 0 },
    tally: { yes: 1, no: 0 },
    outcome: overrides.outcome ?? SessionOutcome.APPROVED,
    closedAt: new Date(1),
    // Real where assessDecision reads (category, outcome, every signature);
    // nominal in the tally fields it never touches — hence the one wide cast.
  } as unknown as DecisionDocument;
}

describe("assessDecision — evidence, not authority", () => {
  it("ratifies an approved GOVERNANCE_RULES decision whose every signature verifies", () => {
    expect(assessDecision(signedDecision({}))).toEqual({ ratified: true });
  });

  it("refuses the wrong category, however cleanly signed", () => {
    const a = assessDecision(signedDecision({ category: DecisionCategory.OPERATIONS }));
    expect(a.ratified).toBe(false);
    if (!a.ratified) expect(a.reason).toContain("OPERATIONS");
  });

  it("refuses a rejected or expired decision", () => {
    for (const outcome of [SessionOutcome.REJECTED, SessionOutcome.EXPIRED]) {
      const a = assessDecision(signedDecision({ outcome }));
      expect(a.ratified, outcome).toBe(false);
    }
  });

  it("refuses when a vote's signed text does not match its signature — the record is recounted, not read", () => {
    const a = assessDecision(signedDecision({ tamperVote: true }));
    expect(a.ratified).toBe(false);
    if (!a.ratified) expect(a.reason).toContain("Mao");
  });

  it("refuses when the proposer's message was altered after signing", () => {
    expect(assessDecision(signedDecision({ tamperProposer: true })).ratified).toBe(false);
  });
});

describe("the way forward", () => {
  it("ratificationHref is a pre-filled GOVERNANCE_RULES proposal naming the change", () => {
    const href = ratificationHref({
      subject: "raise operations quorum to 40%",
      url: "https://github.com/bitbaum/solon/pull/172",
    });
    const q = new URLSearchParams(href.slice("/propose?".length));
    expect(q.get("category")).toBe("GOVERNANCE_RULES");
    expect(q.get("title")).toBe("Ratify: raise operations quorum to 40%");
    expect(q.get("body")).toContain("pull/172");
  });

  it("report: nothing to say when the constitution is untouched", () => {
    expect(report({ changedConstitution: false, claims: [], ratifyHref: "/x" }).level).toBe("none");
  });

  it("report: a warning with the link when no claim ratifies — and it says the PR can still merge", () => {
    const r = report({
      changedConstitution: true,
      claims: [{ id: "bad", assessment: { ratified: false, reason: "was REJECTED" } }],
      ratifyHref: "/propose?category=GOVERNANCE_RULES",
    });
    expect(r.level).toBe("warning");
    expect(r.lines.join("\n")).toContain("can still merge");
    expect(r.lines.join("\n")).toContain("/propose?category=GOVERNANCE_RULES");
    expect(r.lines.join("\n")).toContain("Decision bad: was REJECTED");
  });

  it("report: a notice naming the decision when one ratifies", () => {
    const r = report({
      changedConstitution: true,
      claims: [{ id: "good", assessment: { ratified: true } }],
      ratifyHref: "/x",
    });
    expect(r.level).toBe("notice");
    expect(r.lines[0]).toContain("good");
  });
});
