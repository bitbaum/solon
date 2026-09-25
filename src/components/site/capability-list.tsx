import { useTranslations } from "next-intl";
import { CAPABILITIES, type CapabilityKey } from "@/lib/content/capabilities";

const DOT: Record<string, string> = {
  available: "bg-status-positive",
  inDevelopment: "bg-accent",
  planned: "border border-strong",
};

/**
 * Which of the capabilities a page names are real today. The status comes
 * from lib/content/capabilities.ts, never from the page — so the page cannot
 * overstate it.
 */
export default function CapabilityList({ items }: { items: CapabilityKey[] }) {
  const t = useTranslations("Capabilities");
  const status = useTranslations("Status");
  return (
    <ul className="divide-y divide-subtle border-y border-subtle">
      {items.map((key) => {
        const s = CAPABILITIES[key];
        return (
          <li key={key} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:gap-8">
            <div>
              <div className="font-semibold text-fg-primary">{t(`${key}.name`)}</div>
              <p className="mt-1 text-sm text-fg-secondary">{t(`${key}.body`)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-caps text-fg-secondary">
              <span className={`h-2 w-2 rounded-pill ${DOT[s]}`} aria-hidden="true" />
              {status(s)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
