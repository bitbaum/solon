import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AmendmentSummary } from "@/lib/law/amend/store";

/**
 * Proposed changes as one list with one row anatomy: the proposal's title,
 * then the act it amends and how many stand behind it. Used on the index, on
 * an act and on a place, so a proposal looks the same wherever it is found.
 */
export default async function AmendmentList({
  amendments,
  showAct = true,
  empty,
}: {
  amendments: AmendmentSummary[];
  /** Leave the act's name out where the page is already about that act. */
  showAct?: boolean;
  empty: string;
}) {
  const t = await getTranslations("Amend.list");
  if (amendments.length === 0) return <p className="text-fg-secondary">{empty}</p>;
  return (
    <ul className="divide-y divide-subtle border-y border-subtle">
      {amendments.map((a) => (
        <li key={a.id}>
          <Link href={`/law/amendments/${a.id}`} className="block min-h-11 py-4 hover:opacity-80">
            <span className="block font-medium text-fg-primary">{a.title}</span>
            <span className="mt-1 block text-sm text-fg-secondary">
              {[
                showAct ? (a.actTitle ?? null) : null,
                t("row", {
                  revision: a.revision,
                  support: t("supporters", { total: a.support.total }),
                }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
