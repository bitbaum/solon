import type { PlaceSource } from "@/lib/places/place-view";
import type { PlacesTranslator } from "./place-profile";

/** The registered sources behind what a page shows, each with its retrieval and licence. */
export default function SourceList({
  sources,
  t,
}: {
  sources: PlaceSource[];
  t: PlacesTranslator;
}) {
  if (sources.length === 0) {
    return null;
  }
  return (
    <section>
      <h2 className="mb-3 font-semibold text-fg-primary">{t("sources.title")}</h2>
      <ul className="space-y-3 text-sm">
        {sources.map((source) => (
          <li key={`${source.publisher}-${source.dataset}`} className="text-fg-secondary">
            <a
              href={source.homepage}
              className="text-fg-primary hover:underline"
              rel="noopener noreferrer"
            >
              {source.publisher}: {source.dataset}
            </a>
            <span className="block text-xs">
              {t("sources.retrieved", { date: source.retrievedAt })} ·{" "}
              {t("sources.licence", { licence: source.licence })}
              {source.attribution && ` · ${source.attribution}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
