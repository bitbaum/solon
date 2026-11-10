/**
 * A topic's gaps page as numbered facts (see brief.ts), so an AI asked about
 * it answers from what was read and nothing else: the question, the purposes,
 * what each place publishes with its crossings and legal frame, where a gap
 * is, what must accompany a breakdown, and the objections with safeguards.
 */
import { localized } from "@/lib/places/place-view";
import type { BriefFact } from "./brief";
import { gapsOf, type Coverage, type Topic } from "./gaps";

export function buildGapsBrief(
  topic: Topic,
  coverage: readonly Coverage[],
  placeName: (a2: string) => string,
): BriefFact[] {
  const lines: { text: string; href?: string }[] = [];
  const en = (t: Parameters<typeof localized>[0]) => localized(t, "en");
  lines.push({ text: `The question: ${en(topic.question)}` });
  for (const p of topic.purposes) lines.push({ text: `A purpose of measuring it: ${en(p)}` });
  const variantLabel = (k: string) => en(topic.variants.find((v) => v.key === k)!.label);
  for (const c of coverage.filter((x) => x.topic === topic.key)) {
    lines.push({
      text: `${placeName(c.place.value)}, ${variantLabel(c.variant)}: ${c.status.replaceAll("_", " ")}${
        c.crossings.length ? `, crossed with ${c.crossings.join(" and ")}` : ""
      }. ${en(c.summary)}${c.frame ? ` The frame: ${en(c.frame)}` : ""}${
        c.unread.length ? ` Not read: ${c.unread.join("; ")}.` : ""
      } (${c.publisher})`,
      href: c.evidence[0]?.url,
    });
  }
  for (const g of gapsOf(topic.key, coverage)) {
    lines.push({
      text: `A gap: ${placeName(g.place)} is ${g.status.replaceAll("_", " ")} for "${variantLabel(g.variant)}", which ${g.publishedElsewhere.map(placeName).join(", ")} publish.`,
    });
  }
  for (const c of topic.cautions) lines.push({ text: `Caution when reading it: ${en(c)}` });
  for (const c of topic.companions)
    lines.push({ text: `What should accompany a breakdown: ${en(c)}` });
  for (const r of topic.risks)
    lines.push({ text: `A risk: ${en(r.risk)} A safeguard: ${en(r.safeguard)}` });
  return lines.map((l, i) => ({
    id: `F${i + 1}`,
    kind: "statement" as const,
    params: { text: l.text },
    ...(l.href ? { href: l.href } : {}),
  }));
}
