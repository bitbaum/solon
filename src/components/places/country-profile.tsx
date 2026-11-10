import type { WorldProfileView } from "@/lib/places/world-profile";
import type { PlacesTranslator } from "./translator";

/** What kind of place it is, in one neutral sentence: the hero's line and the card's first. */
export function profileStatus(profile: WorldProfileView, t: PlacesTranslator): string {
  return profile.kind === "state" && profile.unSince
    ? t("profile.kinds.state", {
        date: profile.facts.find((f) => f.key === "unSince")?.value ?? profile.unSince,
      })
    : profile.kind === "territory" && profile.within
      ? t("profile.kinds.territoryOf", { country: profile.within.name })
      : profile.kind === "special"
        ? profile.within
          ? t("profile.kinds.special", { country: profile.within.name })
          : t("profile.kinds.specialNoCountry")
        : t(`profile.kinds.${profile.kind === "state" ? "territory" : profile.kind}`);
}

/** The facts the hero carries, over the photograph; the glance below holds the rest. */
export const HERO_FACTS = ["capital", "population", "area"] as const;

/**
 * A country's, a territory's or a proclaimed state's facts at a glance, the
 * same card on every such page beside its law: the facts the hero does not
 * carry, how many official routes change its law, and where it all comes from.
 * The way into its constitution and its law is the hero's.
 */
export default function CountryProfile({
  profile,
  t,
}: {
  profile: WorldProfileView;
  t: PlacesTranslator;
}) {
  const day = new Date(`${profile.read}T00:00:00Z`).toISOString().slice(0, 10);
  const facts = profile.facts.filter(
    (f) => f.key !== "unSince" && !(HERO_FACTS as readonly string[]).includes(f.key),
  );
  return (
    <section
      aria-labelledby="place-profile"
      className="rounded-surface border border-default bg-surface-base p-5 sm:p-6"
    >
      <h2 id="place-profile" className="mb-0 font-semibold text-fg-primary">
        {t("profile.title")}
      </h2>
      {profile.description && (
        <p className="mb-0 mt-2 text-sm text-fg-secondary">{profile.description}</p>
      )}
      {facts.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-1">
          {facts.map((f) => (
            <div key={f.key} className="min-w-0">
              <dt className="text-fg-tertiary">{t(`profile.facts.${f.key}`)}</dt>
              <dd className="mb-0 break-words text-fg-primary">
                {f.href ? (
                  <a href={f.href} className="underline" rel="noopener noreferrer">
                    {f.value}
                  </a>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {profile.authority && (
        <p className="mb-0 mt-4 border-t border-default pt-4 text-sm text-fg-secondary">
          {profile.constitution ? null : <>{t("profile.noConstitution")} </>}
          {t("profile.routes", { count: profile.routes })}
        </p>
      )}
      <p className="mb-0 mt-4 text-xs text-fg-tertiary">
        {t.rich("profile.source", {
          date: day,
          wikidata: (chunks) => (
            <a
              href={`https://www.wikidata.org/wiki/${profile.wikidata}`}
              className="underline"
              rel="noopener noreferrer"
            >
              {chunks}
            </a>
          ),
          un: (chunks) => (
            <a
              href="https://www.un.org/en/about-us/member-states"
              className="underline"
              rel="noopener noreferrer"
            >
              {chunks}
            </a>
          ),
        })}
        {profile.kind === "proclaimed" && <> {t("profile.rule")}</>}
      </p>
    </section>
  );
}
