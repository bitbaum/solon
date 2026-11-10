import { Link } from "@/i18n/navigation";
import type { WorldProfileView } from "@/lib/places/world-profile";
import type { PlacesTranslator } from "./translator";

/**
 * A country's, a territory's or a proclaimed state's profile, the same card on
 * every such page: what kind of place it is, its facts with where they come
 * from, and the way into its constitution and its law.
 */
export default function CountryProfile({
  profile,
  t,
}: {
  profile: WorldProfileView;
  t: PlacesTranslator;
}) {
  const day = new Date(`${profile.read}T00:00:00Z`).toISOString().slice(0, 10);
  const status =
    profile.kind === "state" && profile.unSince
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
  const facts = profile.facts.filter((f) => f.key !== "unSince");
  return (
    <section
      aria-labelledby="place-profile"
      className="rounded-surface border border-default bg-surface-base p-5 sm:p-6"
    >
      <h2 id="place-profile" className="mb-2 font-semibold text-fg-primary">
        {t("profile.title")}
      </h2>
      <p className="mb-0 text-sm text-fg-secondary">{status}</p>
      {profile.description && (
        <p className="mb-0 mt-2 text-sm text-fg-secondary">{profile.description}</p>
      )}
      {facts.length > 0 && (
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
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
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {profile.constitution ? (
          <Link href={`/law/${profile.constitution.actId}`} className="btn-primary min-h-11">
            {t("profile.constitution")}
          </Link>
        ) : (
          <p className="mb-0 text-sm text-fg-secondary">{t("profile.noConstitution")}</p>
        )}
        {profile.authority && (
          <Link
            href={`/law/place/${profile.authority}`}
            className="text-sm font-semibold text-fg-primary hover:underline"
          >
            {t("profile.allLaw")} →
          </Link>
        )}
      </div>
      {profile.authority && (
        <p className="mb-0 mt-3 text-sm text-fg-secondary">
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
