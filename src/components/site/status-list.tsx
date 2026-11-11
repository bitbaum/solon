import { Link } from "@/i18n/navigation";

/**
 * Whether a thing a page names is real today. "researched" is a fact read and
 * written down with its sources but not yet loaded into Solon.
 */
export type ItemStatus = "available" | "inDevelopment" | "planned" | "researched";

const DOT: Record<ItemStatus, string> = {
  available: "bg-status-positive",
  inDevelopment: "bg-accent",
  planned: "border border-strong",
  researched: "border border-strong",
};

export interface StatusItem {
  key: string;
  name: string;
  body: string;
  status: ItemStatus;
  /** Where the thing is, when it is live: the name links there. */
  href?: string;
}

/**
 * One row per thing: its name, what it does, and whether it is real today.
 * Every list of promises on the site has this one shape (CapabilityList, the
 * /statistics/why explainer), so a planned thing never looks like a live one.
 */
export default function StatusList({
  items,
  statusLabel,
}: {
  items: readonly StatusItem[];
  statusLabel: (status: ItemStatus) => string;
}) {
  return (
    <ul className="divide-y divide-subtle border-y border-subtle">
      {items.map((item) => (
        <li key={item.key} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:gap-8">
          <div>
            <div className="font-semibold text-fg-primary">
              {item.href ? (
                <Link href={item.href} className="underline-offset-4 hover:underline">
                  {item.name}
                </Link>
              ) : (
                item.name
              )}
            </div>
            <p className="mt-1 text-sm text-fg-secondary">{item.body}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-caps text-fg-secondary">
            <span
              className={`h-2 w-2 shrink-0 rounded-pill ${DOT[item.status]}`}
              aria-hidden="true"
            />
            {statusLabel(item.status)}
          </div>
        </li>
      ))}
    </ul>
  );
}
