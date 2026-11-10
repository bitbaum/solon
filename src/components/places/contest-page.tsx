import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import type { ContestProvision } from "@/lib/places/contested";
import type { ContestSideView, ContestView } from "@/lib/places/contest-view";
import { localized } from "@/lib/places/place-view";
import { PlaceTrail } from "./place-head";
import type { PlacesTranslator } from "./translator";

interface ContestPageProps {
  view: ContestView;
  /** Solon's id of each act a provision cites, by `authority:scheme:value`, when the register holds it. */
  actIds: ReadonlyMap<string, string>;
  locale: string;
  t: PlacesTranslator;
}

export const actKey = (act: { authority: string; scheme: string; value: string }) =>
  `${act.authority}:${act.scheme}:${act.value}`;

/** One side's words on one question: the article, the words as read, a translation, the page. */
function ProvisionQuote({
  provision,
  actId,
  locale,
  t,
}: {
  provision: ContestProvision;
  actId: string | null;
  locale: string;
  t: PlacesTranslator;
}) {
  const { quote } = provision;
  const translation = quote.translation ? localized(quote.translation, locale) : null;
  return (
    <figure className="min-w-0 space-y-2">
      <figcaption className="text-sm font-semibold text-fg-primary">
        {actId ? (
          <Link
            href={
              provision.provision
                ? `/law/${actId}?at=${encodeURIComponent(provision.provision)}#${provision.provision}`
                : `/law/${actId}`
            }
            className="hover:underline"
          >
            {provision.label} →
          </Link>
        ) : (
          provision.label
        )}
      </figcaption>
      <blockquote
        lang={quote.lang}
        className="mb-0 whitespace-pre-line border-l-2 border-default pl-3 text-sm text-fg-primary"
      >
        {quote.text}
      </blockquote>
      {translation && translation !== quote.text && (
        <p className="mb-0 whitespace-pre-line pl-3 text-sm text-fg-secondary">
          <span className="text-fg-tertiary">{t("contested.translation")} </span>
          {translation}
        </p>
      )}
      <ul className="mb-0 space-y-1 pl-3 text-xs text-fg-tertiary">
        {provision.translator && (
          <li>{t("contested.translatedBy", { translator: provision.translator })}</li>
        )}
        {quote.evidence.map((e) => (
          <li key={e.url} className="break-words">
            <a href={e.url} className="underline" rel="noopener noreferrer">
              {e.publisher}
            </a>{" "}
            · {t("contested.read", { date: e.read })}
          </li>
        ))}
      </ul>
    </figure>
  );
}

function SideCard({ side, t }: { side: ContestSideView; t: PlacesTranslator }) {
  return (
    <li className="min-w-0 space-y-2 rounded-surface border border-default bg-surface-base p-5">
      <p className="mb-0 text-sm text-fg-tertiary">{t(`contested.role.${side.role}`)}</p>
      <p className="mb-0 text-lg font-semibold text-fg-primary">
        <Link href={side.href} className="hover:underline">
          {side.name}
        </Link>
      </p>
      {side.lawAuthority ? (
        <Link
          href={`/law/place/${side.lawAuthority}`}
          className="inline-block text-sm font-semibold text-fg-primary hover:underline"
        >
          {t("contested.readLaw", { side: side.name })} →
        </Link>
      ) : (
        <p className="mb-0 text-sm text-fg-secondary">
          {t("contested.lawNotHeld", { side: side.name })}
        </p>
      )}
    </li>
  );
}

/**
 * A claimed place, question by question: who governs it and who claims it, then
 * for each question the same for every place, each side's own words beside the
 * other's, in a fixed order (the side that governs, then the claimant). A side
 * with nothing read says so. Solon's words only frame; the rest is quotation.
 */
export default function ContestPage({ view, actIds, locale, t }: ContestPageProps) {
  const claimant = view.sides.find((s) => s.role === "claims");
  const propose = proposeHref({
    category: DEFAULT_CATEGORY,
    title: t("contested.proposeTitle", { place: view.name }),
    body: t("contested.proposeBody", {
      place: view.name,
      sides: view.sides.map((s) => s.name).join(", "),
    }),
  });
  return (
    <PageLayout
      title={t("contested.title", { place: view.name })}
      kicker={t("contested.kicker")}
      description={t("contested.intro", {
        place: view.name,
        claimant: claimant?.name ?? "",
      })}
    >
      <div className="max-w-5xl space-y-10">
        <PlaceTrail above={[]} name={view.name} t={t} />

        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          {view.sides.map((side) => (
            <SideCard key={side.key} side={side} t={t} />
          ))}
        </ul>

        <p className="mb-0 text-sm text-fg-secondary">
          {t("contested.progress", { compared: view.compared, topics: view.topics })}
        </p>

        {view.rows.map((row) => (
          <section
            key={row.key}
            aria-labelledby={`topic-${row.key}`}
            className="rounded-surface border border-default bg-surface-base"
          >
            <div className="border-b border-default p-5 sm:p-6">
              <h2 id={`topic-${row.key}`} className="font-semibold text-fg-primary">
                {row.label}
              </h2>
              <p className="mb-0 mt-1 text-sm text-fg-secondary">{row.question}</p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] divide-y divide-default md:grid-cols-2 md:divide-x md:divide-y-0">
              {row.cells.map((cell) => {
                const side = view.sides.find((s) => s.key === cell.side)!;
                return (
                  <div key={cell.side} className="min-w-0 space-y-4 p-5 sm:p-6">
                    <h3 className="text-sm font-semibold text-fg-secondary">{side.name}</h3>
                    {cell.provisions.length > 0 ? (
                      cell.provisions.map((p) => (
                        <ProvisionQuote
                          key={p.label}
                          provision={p}
                          actId={p.act ? (actIds.get(actKey(p.act)) ?? null) : null}
                          locale={locale}
                          t={t}
                        />
                      ))
                    ) : (
                      <p className="mb-0 text-sm text-fg-secondary">
                        {t("contested.gap", { side: side.name })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <section
          aria-labelledby="contest-act"
          className="rounded-surface border border-default bg-surface-base p-5 sm:p-6"
        >
          <h2 id="contest-act" className="mb-1 font-semibold text-fg-primary">
            {t("contested.actTitle")}
          </h2>
          <p className="mb-4 text-sm text-fg-secondary">
            {t("contested.actIntro", { place: view.name })}
          </p>
          <Link href={propose} className="btn-primary min-h-11">
            {t("contested.propose", { place: view.name })}
          </Link>
        </section>

        <details className="rounded-surface border border-default bg-surface-base p-5 text-sm sm:p-6">
          <summary className="cursor-pointer font-semibold text-fg-primary">
            {t("contested.methodTitle")}
          </summary>
          <div className="mt-4 space-y-3 text-fg-secondary">
            {view.open && <p className="mb-0">{view.open}</p>}
            <p className="mb-0">{t("contested.method")}</p>
            <Link href="/places/contested" className="inline-block text-fg-primary hover:underline">
              {t("contested.all")} →
            </Link>
          </div>
        </details>
      </div>
    </PageLayout>
  );
}
