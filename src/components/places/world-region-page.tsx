import { Link } from "@/i18n/navigation";
import ProfileFrame from "./profile-frame";
import type { PlaceLaw } from "@/lib/law/place-law";
import BudgetLinkCard, { type BudgetLink } from "@/components/budgets/budget-link-card";
import ContestNote, { type ContestNoteProps } from "./contest-note";
import CountryProfile from "./country-profile";
import type { WorldProfileView } from "@/lib/places/world-profile";
import { PlaceLawCard, PlaceTrail } from "./place-head";
import type { PlacesTranslator } from "./translator";

interface WorldRegionPageProps {
  name: string;
  /** For a place that governs itself without being a UN member: who claims it, and its comparison. */
  contest: ContestNoteProps | null;
  /** The way into its public budget, when Solon holds one. */
  budget: BudgetLink | null;
  law: readonly PlaceLaw[];
  /** Its profile: kind, facts and the way into its law. */
  profile: WorldProfileView | null;
  /** Its photograph and title, when it has one. */
  hero?: React.ReactNode | null;
  t: PlacesTranslator;
}

/**
 * A country or territory whose places Solon does not hold yet: its own page
 * all the same, so it can be found and shared, with the law Solon does hold
 * for it and the way to see what is covered. Same frame as a place page.
 */
export default function WorldRegionPage({
  name,
  contest,
  budget,
  law,
  profile,
  hero = null,
  t,
}: WorldRegionPageProps) {
  return (
    <ProfileFrame
      hero={hero}
      title={name}
      kicker={profile ? t(`profile.kicker.${profile.kind}`) : t("world.kicker")}
    >
      <div className="max-w-3xl space-y-10">
        <PlaceTrail above={[]} name={name} t={t} />

        {contest && <ContestNote {...contest} t={t} />}

        {profile && <CountryProfile profile={profile} t={t} statusShown={!!hero} />}

        <PlaceLawCard law={law} name={name} t={t} />

        {budget && <BudgetLinkCard {...budget} />}

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
    </ProfileFrame>
  );
}
