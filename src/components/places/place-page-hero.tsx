import { profileStatus, HERO_FACTS } from "./country-profile";
import { PlaceTrail } from "./place-head";
import PlaceHero from "./place-hero";
import ShareButton from "./share-button";
import type { PlacesTranslator } from "./translator";
import type { PlaceLaw } from "@/lib/law/place-law";
import { placePhoto } from "@/lib/places/place-photo";
import type { PlaceLink, PlaceView } from "@/lib/places/place-view";
import type { WorldProfileView } from "@/lib/places/world-profile";
import { WORLD_PACK } from "@/lib/config/places/countries/world";

/**
 * The top of every place's page: where it sits, its kind, its name, the
 * sentence that says what it is, a country's capital, population and area, and
 * the page's one main action: its constitution, else its law. Over its
 * photograph when Solon holds one.
 */
export function placeHero({
  keys,
  title,
  kicker,
  line,
  profile,
  law,
  above,
  t,
}: {
  keys: readonly string[];
  title: string;
  kicker: string;
  line: string | null;
  profile: WorldProfileView | null;
  law: readonly PlaceLaw[];
  above: readonly PlaceLink[];
  t: PlacesTranslator;
}) {
  const photo = placePhoto(keys);
  const facts = (profile?.facts ?? [])
    .filter((f) => (HERO_FACTS as readonly string[]).includes(f.key))
    // A population of none (Liberland's) is no headline.
    .filter((f) => !(f.key === "population" && /^0(\s|$)/.test(f.value)))
    .map((f) => ({ label: t(`profile.facts.${f.key}`), value: f.value }));
  const lawKey = profile?.authority ?? law[0]?.key ?? null;
  const allLaw = lawKey ? { href: `/law/place/${lawKey}`, label: t("profile.allLaw") } : null;
  const constitution = profile?.constitution
    ? { href: `/law/${profile.constitution.actId}`, label: t("profile.constitution") }
    : null;
  return (
    <PlaceHero
      photo={photo}
      trail={<PlaceTrail above={above} t={t} />}
      share={<ShareButton title={title} />}
      kicker={kicker}
      title={title}
      line={line}
      facts={facts}
      primary={constitution ?? allLaw}
      secondary={constitution ? allLaw : null}
      credit={
        photo ? t("photoCredit", { author: photo.author, license: photo.license }) : undefined
      }
    />
  );
}

/** The hero of a place Solon holds: by its identifiers, and its country's world entry when it is one. */
export function placeViewHero({
  view,
  country,
  profile,
  law,
  t,
}: {
  view: PlaceView;
  /** The world entry's slug, when the place is a country's own page. */
  country: string | null;
  profile: WorldProfileView | null;
  law: readonly PlaceLaw[];
  t: PlacesTranslator;
}) {
  // Nearest first; the world itself goes without saying, as in the trail.
  const above = [...view.partOf].reverse().filter((p) => p.slugPath !== WORLD_PACK);
  return placeHero({
    keys: [...(country ? [`world:${country}`] : []), ...view.refs],
    title: view.name,
    kicker: profile ? t(`profile.kicker.${profile.kind}`) : view.levelName,
    line: profile
      ? profileStatus(profile, t)
      : above.length > 0
        ? t("summaryIn", { level: view.levelName, place: above.map((p) => p.name).join(", ") })
        : null,
    profile,
    law,
    above: view.partOf,
    t,
  });
}
