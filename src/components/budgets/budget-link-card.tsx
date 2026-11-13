import { Link } from "@/i18n/navigation";

export interface BudgetLink {
  title: string;
  text: string;
  open: string;
  href: string;
}

/** On a place's page: the way into its public budget, in the same frame as the place's other cards. */
export default function BudgetLinkCard({ title, text, open, href }: BudgetLink) {
  return (
    <section className="rounded-surface border border-default bg-surface-base p-5 sm:p-6">
      <h2 className="mb-2 font-semibold text-fg-primary">{title}</h2>
      <p className="text-sm text-fg-secondary">{text}</p>
      <Link
        href={href}
        className="mt-4 inline-block text-sm font-semibold text-fg-primary hover:underline"
      >
        {open} →
      </Link>
    </section>
  );
}
