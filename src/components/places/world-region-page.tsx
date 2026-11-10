import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import type { PlaceLaw } from "@/lib/law/place-law";
import { PlaceLawCard, PlaceTrail } from "./place-head";
import type { PlacesTranslator } from "./translator";

interface WorldRegionPageProps {
  name: string;
  /** The UN member that regards it as part of its territory, for a place that governs itself without being one. */
  claimedBy: { name: string; href: string } | null;
  law: readonly PlaceLaw[];
  t: PlacesTranslator;
}

/**
 * A country or territory whose places Solon does not hold yet: its own page
 * all the same, so it can be found and shared, with the law Solon does hold
 * for it and the way to see what is covered. Same frame as a place page.
 */
export default function WorldRegionPage({ name, claimedBy, law, t }: WorldRegionPageProps) {
  return (
    <PageLayout title={name} kicker={t("world.kicker")}>
      <div className="max-w-3xl space-y-10">
        <PlaceTrail above={[]} name={name} t={t} />

        {claimedBy && (
          <p className="text-sm text-fg-secondary">
            {t.rich("world.claimed", {
              claimant: claimedBy.name,
              link: (chunks) => (
                <Link href={claimedBy.href} className="text-fg-primary hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}

        <PlaceLawCard law={law} name={name} t={t} />

        <section
          aria-labelledby="region-parts"
          className="rounded-surface border border-default bg-surface-base p-5 sm:p-6"
        >
          <h2 id="region-parts" className="mb-2 font-semibold text-fg-primary">
            {t("parts.title", { place: name })}
          </h2>
          <p className="text-sm text-fg-secondary">{t("world.notYet", { place: name })}</p>
          <Link
            href="/places/coverage"
            className="mt-4 inline-block text-sm font-semibold text-fg-primary hover:underline"
          >
            {t("world.coverage")} →
          </Link>
        </section>
      </div>
    </PageLayout>
  );
}
