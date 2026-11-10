/**
 * Answers a legal question from the provisions found, and only from them. Every
 * provision is a numbered source the answer cites as [L1]; chatkit turns the
 * handle into a link to the act at the place the provision is read from.
 */
import { REPLIES_INSTRUCTION } from "@bitbaum/chatkit";
import type { ChatMessage } from "@bitbaum/ai-kit";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import type { ProvisionHit } from "../search";
import type { Plan, Turn } from "./plan";
import type { WebSource } from "./research";

export interface Source {
  id: string;
  label: string;
  detail: string;
  href: string;
}

const authorityName = (key: string): string =>
  LAW_AUTHORITIES.find((a) => a.key === key)?.label ?? key;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** The handle, what it is, and where to read it: provisions as [L#], web pages as [W#]. */
export function sourcesOf(hits: readonly ProvisionHit[], web: readonly WebSource[] = []): Source[] {
  return [
    ...hits.map((hit, i) => ({
      id: `L${i + 1}`,
      label: `${authorityName(hit.authority)} · ${hit.heading.split(" ").slice(0, 2).join(" ")}`,
      detail: `${hit.title ?? hit.systematicNumber ?? ""} · ${hit.heading}`.trim(),
      href: `/law/${hit.actId}?at=${encodeURIComponent(hit.path)}#${hit.path}`,
    })),
    ...web.map((page, i) => ({
      id: `W${i + 1}`,
      label: hostOf(page.url),
      detail: page.title,
      href: page.url,
    })),
  ];
}

const instructions = (
  language: string,
): string => `You answer questions about the law Solon holds: Switzerland, Liechtenstein, Luxembourg, Estonia and the US states of Wyoming and New Hampshire. You are given the provisions found for this question, each with a handle like [L1].

Rules:
- Answer only from the provisions below. Never add law from memory. If they do not settle the question, say what they do cover and what is missing, and what the person could look for next.
- Cite every statement with the handle of the provision it rests on, written in square brackets with no spaces inside, right after the statement: "A permit is required [L3]." or "[L3, L5]" An answer without handles is wrong. Use only handles from the list; never write a provision number as a handle.
- Some provisions found may not bear on the question (a search finds words, not meaning). Use the ones that do and ignore the rest; do not mention them.
- Say which place each rule comes from (the Confederation, a canton, a commune, Liechtenstein, Luxembourg). Swiss federal law applies throughout Switzerland and nowhere else; a canton's own rule adds to or applies it.
- When the question names several places, say what each place's law provides, one after another or in a short table, and what is the same.
- Write the answer in ${language}, the quick replies included. Plainly, short first: the answer, then the reasons. No preamble.
- This is legal information from the published text, not advice for a particular case. Say so only when a decision depends on facts you do not have.
- Web pages, if any, are listed after the provisions as [W1], [W2]. They are not law: use them only for what the law leaves to an authority or to practice (a deadline set each year, a form, where to file or pay, a current figure), cite them with their handle, and never state a rule from a web page that the provisions do not state.
- Give the in-force date of a provision only if it matters. Some cantonal texts are dated by the day Solon read them, not by the publisher; do not claim an in-force date for those.`;

export function answerMessages(
  turns: readonly Turn[],
  plan: Plan,
  hits: readonly ProvisionHit[],
  web: readonly WebSource[] = [],
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
  const system = `${instructions(plan.language)}\n\n${REPLIES_INSTRUCTION}\n\nPlaces searched: ${plan.authorities.map(authorityName).join(", ")}.\nThe question, stood on its own: ${plan.question}\n\nPROVISIONS\n${sources || "(none found)"}${pages ? `\n\nWEB PAGES (not law)\n${pages}` : ""}`;
  return [{ role: "system", content: system }, ...turns.slice(-8)];
}
