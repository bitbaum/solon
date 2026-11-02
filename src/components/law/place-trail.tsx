import { Link } from "@/i18n/navigation";
import { chainOf } from "@/lib/law/places";
import type { LawTranslator } from "./coverage-report";

/**
 * Where the reader is: Law › Confederation › Zug › Baar. Every step is a page of
 * that place's laws, so the way back up is always one tap.
 */
export default function PlaceTrail({ authority, t }: { authority: string; t: LawTranslator }) {
  const steps = chainOf(authority).reverse();
  return (
    <nav aria-label={t("act.trail")} className="text-sm text-fg-tertiary">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/law" className="underline">
            {t("index.kicker")}
          </Link>
        </li>
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2">
            <span aria-hidden="true">›</span>
            <Link href={`/law/place/${step.key}`} className="underline">
              {step.name}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
