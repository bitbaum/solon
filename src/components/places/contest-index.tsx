import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import type { ContestSummary } from "@/lib/places/contest-view";
import type { PlacesTranslator } from "./translator";

/**
 * Every place the world list says another state claims, each opening its
 * comparison and saying how many questions have words from both sides. A place
 * with none is listed all the same: what is not compared yet is shown, not hidden.
 */
export default function ContestIndex({
  places,
  t,
}: {
  places: readonly ContestSummary[];
  t: PlacesTranslator;
}) {
  return (
    <PageLayout
      title={t("contested.indexTitle")}
      kicker={t("contested.kicker")}
      description={t("contested.indexIntro")}
    >
      <ul className="max-w-3xl divide-y divide-default overflow-hidden rounded-surface border border-default bg-surface-base">
        {places.map((place) => (
          <li key={place.slug}>
            <Link
              href={`/places/contested/${place.slug}`}
              className="flex min-h-11 items-center justify-between gap-3 px-5 py-3 hover:bg-surface-raised sm:px-6"
            >
              <span className="min-w-0">
                <span className="block font-medium text-fg-primary">{place.name}</span>
                <span className="block text-sm text-fg-tertiary">
                  {t("contested.claimedBy", { claimant: place.claimant })}
                </span>
              </span>
              <span className="shrink-0 text-sm text-fg-tertiary">
                {t("contested.progressShort", { compared: place.compared, topics: place.topics })} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
