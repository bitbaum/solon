/**
 * What each entry on an organization's record means, in a sentence a member
 * can read. The record itself is the exact payload, kept one click away under
 * "Technical details"; this is the reading of it.
 *
 * Payloads are historical: fields were added and renamed over time, and old
 * rows keep the shape they were written with. Every field is therefore read as
 * optional, and an event whose payload says nothing readable gets no sentence
 * rather than a wrong one.
 */
import { CATEGORY_LABEL } from "@/lib/config/governance";
import { profileFor } from "@/lib/config/governance-profiles";
import {
  DECISION_CATEGORIES,
  SESSION_OUTCOMES,
  type AuditEventType,
  type DecisionCategory,
  type SessionOutcome,
} from "@/lib/db/enums";
import { proposalStanding } from "./plain-words";

export const EVENT_LABEL: Record<AuditEventType, string> = {
  ORG_CREATED: "Organization created",
  MEMBER_ADDED: "New member",
  MEMBER_STATUS_CHANGED: "Membership changed",
  PROPOSAL_CREATED: "Suggestion saved",
  SESSION_OPENED: "Vote started",
  VOTE_CAST: "Someone voted",
  SESSION_CLOSED: "Vote ended",
  POLICY_ACTIVATED: "New rules took effect",
  MANDATE_CHANGED: "Someone was given or lost a role",
  PROFILE_CHANGED: "How decisions are made changed",
};

type Payload = Record<string, unknown>;

const text = (p: Payload, key: string): string | null =>
  typeof p[key] === "string" && (p[key] as string).length > 0 ? (p[key] as string) : null;

const day = (iso: string | null): string | null =>
  iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toISOString().slice(0, 10) : null;

const who = (memberType: unknown): string =>
  memberType === "AGENT" ? "an AI agent" : memberType === "HUMAN" ? "a person" : "a member";

const isCategory = (v: unknown): v is DecisionCategory =>
  typeof v === "string" && (DECISION_CATEGORIES as readonly string[]).includes(v);

const isOutcome = (v: unknown): v is SessionOutcome =>
  typeof v === "string" && (SESSION_OUTCOMES as readonly string[]).includes(v);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One plain sentence for an entry on the record, or null when the payload says nothing readable. */
export function eventGloss(type: AuditEventType, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Payload;

  switch (type) {
    case "ORG_CREATED": {
      const name = text(p, "name");
      return name ? `${name} was founded.` : null;
    }
    case "MEMBER_ADDED": {
      const name = text(p, "displayName");
      const founding = p.genesis === true ? ", taking the founding seat" : "";
      return name
        ? `${name} joined as ${who(p.memberType)}${founding}.`
        : `${capitalize(who(p.memberType))} joined${founding}.`;
    }
    case "PROPOSAL_CREATED": {
      const title = text(p, "title");
      if (!title) return null;
      const about = isCategory(p.category) ? ` (${CATEGORY_LABEL[p.category]})` : "";
      return `“${title}”${about}, suggested by ${who(p.memberType)}.`;
    }
    case "SESSION_OPENED": {
      const voters =
        p.electorate === "HUMANS_ONLY"
          ? "Only people can vote on this, not AI agents."
          : p.electorate === "ALL_MEMBERS"
            ? "All members can vote on this."
            : null;
      const ends = day(text(p, "closesAt"));
      return [voters, ends ? `Voting ends on ${ends}.` : null].filter(Boolean).join(" ") || null;
    }
    case "VOTE_CAST": {
      const weight = typeof p.weight === "number" && p.weight !== 1 ? p.weight : null;
      return `${capitalize(who(p.memberType))} voted${weight ? `; their vote counts ${weight} times` : ""}.`;
    }
    case "SESSION_CLOSED":
      return isOutcome(p.outcome) ? `${proposalStanding("CLOSED", p.outcome)}.` : null;
    case "POLICY_ACTIVATED": {
      const key = text(p, "key");
      if (!key) return null;
      const version = typeof p.version === "number" ? `Version ${p.version} of the` : "The";
      return `${version} “${key.replace(/_/g, " ")}” rules now apply.`;
    }
    case "MANDATE_CHANGED": {
      if (p.grant === false) return "A member no longer decides on the group's behalf.";
      const until = day(text(p, "until"));
      return `A member now decides on the group's behalf${until ? ` until ${until}` : ""}.`;
    }
    case "PROFILE_CHANGED": {
      const to = text(p, "to");
      return to ? `From now on: ${profileFor(to).label.toLowerCase()}.` : null;
    }
    case "MEMBER_STATUS_CHANGED":
      return null;
  }
}
