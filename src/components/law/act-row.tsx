import { highlightRanges, type Range } from "@bitbaum/searchkit";
import { Link } from "@/i18n/navigation";
import type { ActKind } from "@/lib/config/law";
import { authorityOf } from "@/lib/law/places";
import type { ActSearchHit } from "@/lib/law/register/coverage";
import type { LawTranslator } from "./coverage-report";
import { statusLabel } from "./status-label";

/** One act in a list: the title, then where it is from, its number and kind. The one shape every list of acts uses. */
export default function ActRow({
  hit,
  t,
}: {
  hit: ActSearchHit & { marks?: Range[] };
  t: LawTranslator;
}) {
  return (
    <li className="px-5 py-3">
      <Link href={`/law/${hit.id}`} className="font-medium text-fg-primary hover:underline">
        {hit.title && hit.marks?.length
          ? highlightRanges(hit.title, hit.marks).map((part, i) =>
              part.match ? (
                <mark key={i} className="bg-transparent underline">
                  {part.text}
                </mark>
              ) : (
                part.text
              ),
            )
          : (hit.title ?? hit.systematicNumber ?? hit.id)}
      </Link>
      <span className="mt-1 block text-sm text-fg-tertiary">
        {[
          authorityOf(hit.authority)?.name ?? hit.authority,
          hit.systematicNumber,
          t(`kinds.${hit.kind}` as `kinds.${ActKind}`),
          statusLabel(hit, t),
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </li>
  );
}
