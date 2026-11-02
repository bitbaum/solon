import { Link } from "@/i18n/navigation";
import type { ActKind } from "@/lib/config/law";
import { authorityOf } from "@/lib/law/places";
import type { ActSearchHit } from "@/lib/law/register/coverage";
import type { LawTranslator } from "./coverage-report";

/** One act in a list: the title, then where it is from, its number and kind. The one shape every list of acts uses. */
export default function ActRow({ hit, t }: { hit: ActSearchHit; t: LawTranslator }) {
  return (
    <li className="px-5 py-3">
      <Link href={`/law/${hit.id}`} className="font-medium text-fg-primary hover:underline">
        {hit.title ?? hit.systematicNumber ?? hit.id}
      </Link>
      <span className="mt-1 block text-sm text-fg-tertiary">
        {[
          authorityOf(hit.authority)?.name ?? hit.authority,
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
