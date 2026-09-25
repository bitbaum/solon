import { Link } from "@/i18n/navigation";

/**
 * The four questions every organization answers, whether or not it knows it.
 *
 * Most groups answer all four by default — whoever is in the room, a show of
 * hands, half plus one, and someone's memory of what was agreed. None of those
 * are neutral. Laying the stages out in order is the section's whole argument:
 * each one is a decision, each has alternatives, and Solon makes all four
 * explicit and recorded instead of implicit and remembered.
 *
 * Built as flex rather than SVG so it stacks cleanly on a phone — a diagram
 * that needs a pinch-zoom has failed at the one job a diagram has.
 */
const STAGES = [
  {
    step: "01",
    question: "Who may vote?",
    solon: "Electorate",
    detail: "Every member, or humans only — fixed per category, never per vote.",
    href: "/governance/who-decides",
  },
  {
    step: "02",
    question: "What is the ballot?",
    solon: "Method",
    detail: "Yes/no, consent, approval, dots, score or ranked. The question shapes the answer.",
    href: "/governance/methods",
  },
  {
    step: "03",
    question: "What makes it binding?",
    solon: "Quorum and threshold",
    detail: "How many had to turn up, and how much of them had to agree.",
    href: "/governance/thresholds",
  },
  {
    step: "04",
    question: "How does anyone check?",
    solon: "The record",
    detail: "Signed ballots on an append-only trail that anyone can recount.",
    href: "/governance/audit",
  },
];

export function DecisionPipeline() {
  return (
    <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((stage) => (
        <li key={stage.step}>
          <Link
            href={stage.href}
            className="group flex h-full flex-col rounded-control border border-default bg-surface-raised p-5 transition-colors hover:border-interactive"
          >
            <span className="font-mono text-xs text-fg-muted">{stage.step}</span>
            <span className="mt-3 headline text-2xl text-fg-primary">{stage.question}</span>
            <span className="mt-3 inline-flex w-fit rounded-pill border border-accent px-3 py-1 font-mono text-xs uppercase tracking-caps text-accent-text">
              {stage.solon}
            </span>
            <span className="mt-3 text-sm leading-relaxed text-fg-secondary">{stage.detail}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
