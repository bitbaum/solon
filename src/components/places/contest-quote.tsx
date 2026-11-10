import { Link } from "@/i18n/navigation";
import type { ContestProvision } from "@/lib/places/contested";
import { localized } from "@/lib/places/place-view";
import type { PlacesTranslator } from "./translator";

export const actKey = (act: { authority: string; scheme: string; value: string }) =>
  `${act.authority}:${act.scheme}:${act.value}`;

/** One side's words on one question: the article, the words as read, a translation, the page. */
export function ProvisionQuote({
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
  // A reader of the quote's own language needs no translation of it.
  const translation =
    quote.translation && quote.lang !== locale ? localized(quote.translation, locale) : null;
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
      {actId && provision.topic !== "money" && (
        <Link
          href={`/law/${actId}/amend`}
          className="inline-block pl-3 text-sm font-semibold text-fg-primary hover:underline"
        >
          {t("contested.proposeChange")} →
        </Link>
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
