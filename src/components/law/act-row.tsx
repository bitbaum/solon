import { highlightRanges, type Range } from "@bitbaum/searchkit";
import { Link } from "@/i18n/navigation";
import type { ActKind } from "@/lib/config/law";
import type { ActSearchHit } from "@/lib/law/register/coverage";
import type { LawTranslator } from "./coverage-report";
import { authorityName, readerAuthorityNames } from "@/lib/law/authority-names";

/** One act in a list: the title, then where it is from, its number and kind. The one shape every list of acts uses. */
export default async function ActRow({
  hit,
  t,
}: {
  hit: ActSearchHit & { marks?: Range[] };
  t: LawTranslator;
}) {
  const names = await readerAuthorityNames();
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
          authorityName(names, hit.authority),
          hit.systematicNumber,
          t(`kinds.${hit.kind}` as `kinds.${ActKind}`),
          hit.inForce ? null : t("index.notInForce"),
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </li>
  );
}
