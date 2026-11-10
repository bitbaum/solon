import { Link } from "@/i18n/navigation";
import { cite } from "@/lib/i18n/config-catalog";
import { localized } from "@/lib/places/place-view";
import type { LocalizedText } from "@/lib/config/places/schema";

/** An act in the register, by its authority and one identifier: the key a page resolves act ids by. */
export const actKey = (act: { authority: string; scheme: string; value: string }) =>
  `${act.authority}:${act.scheme}:${act.value}`;

export interface QuotedWordsLabels {
  translation: string;
  read: (date: string) => string;
  translatedBy: (translator: string) => string;
  /** The link to propose a change to the article; absent where proposing makes no sense. */
  proposeChange?: string;
}

export interface Quote {
  text: string;
  lang: string;
  translation?: LocalizedText;
  evidence: readonly { publisher: string; url: string; read: string }[];
}

/**
 * Words quoted from a text: where they are (an article of an act Solon holds,
 * linked), the words in their own language, a translation for a reader of
 * another, who translated them when the quote is itself a translation, and
 * every page they were read on with the day. One shape for every quotation
 * Solon shows from the law, a budget or a constitution.
 */
export default function QuotedWords({
  label,
  quote,
  actId,
  provision = null,
  translator,
  locale,
  labels,
}: {
  label: string;
  quote: Quote;
  actId: string | null;
  /** The publisher's anchor of the article in the held act. */
  provision?: string | null;
  translator?: string;
  locale: string;
  labels: QuotedWordsLabels;
}) {
  // A reader of the quote's own language needs no translation of it.
  const translation =
    quote.translation && quote.lang !== locale ? localized(quote.translation, locale) : null;
  return (
    <figure className="min-w-0 space-y-2">
      <figcaption className="text-sm font-semibold text-fg-primary">
        {actId ? (
          <Link
            href={
              provision
                ? `/law/${actId}?at=${encodeURIComponent(provision)}#${provision}`
                : `/law/${actId}`
            }
            className="hover:underline"
          >
            {label} →
          </Link>
        ) : (
          label
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
          <span className="text-fg-tertiary">{labels.translation} </span>
          {translation}
        </p>
      )}
      {actId && labels.proposeChange && (
        <Link
          href={`/law/${actId}/amend`}
          className="inline-block pl-3 text-sm font-semibold text-fg-primary hover:underline"
        >
          {labels.proposeChange} →
        </Link>
      )}
      <ul className="mb-0 space-y-1 pl-3 text-xs text-fg-tertiary">
        {translator && <li>{labels.translatedBy(cite(translator, locale))}</li>}
        {quote.evidence.map((e) => (
          <li key={e.url} className="break-words">
            <a href={e.url} className="underline" rel="noopener noreferrer">
              {cite(e.publisher, locale)}
            </a>{" "}
            · {labels.read(e.read)}
          </li>
        ))}
      </ul>
    </figure>
  );
}
