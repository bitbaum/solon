import type { ReactNode } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { PlacePhoto } from "@/lib/places/place-photo";
import { photoUrl } from "@/lib/places/photo-store";

export interface PlaceHeroFact {
  label: string;
  value: string;
}

export interface PlaceHeroAction {
  href: string;
  label: string;
}

/**
 * The top of every place's page, the same for a country, a canton or a
 * proclaimed state: where it sits and the way to share it; what kind of place
 * it is, its name, one line about it and its headline facts; the main way into
 * its law. Over its photograph, the author and licence in the corner, when it
 * has one; on the plain dark surface when it has none, so a place that gains a
 * photograph changes nothing else.
 *
 * Always in the dark theme: a photograph is light or dark whatever the reader
 * chose, and the scrim carries the text.
 */
export default function PlaceHero({
  photo,
  trail,
  share,
  kicker,
  title,
  line,
  facts,
  primary,
  secondary,
  credit,
}: {
  photo: PlacePhoto | null;
  /** Where the place sits: the trail of places above it. */
  trail: ReactNode;
  share: ReactNode;
  kicker: string;
  title: string;
  line?: string | null;
  facts: readonly PlaceHeroFact[];
  /** The page's one main action, and a quieter second one. */
  primary?: PlaceHeroAction | null;
  secondary?: PlaceHeroAction | null;
  /** "Photo: {author} · {license}", in the reader's language. */
  credit?: string;
}) {
  const height = !photo
    ? "min-h-[40svh]"
    : photo.shape === "banner"
      ? "min-h-[52svh]"
      : "min-h-[78svh]";
  return (
    <section className={`dark relative flex overflow-hidden bg-surface-page ${height}`}>
      {photo && (
        <Image
          src={photoUrl(photo, 1920)}
          alt={title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: photo.position ?? "center 40%" }}
        />
      )}
      <div className="scrim-strong absolute inset-0" aria-hidden="true" />
      <div className="section-shell relative flex w-full flex-col justify-between gap-16 pb-12 pt-6 md:pb-16">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">{trail}</div>
          <div className="shrink-0">{share}</div>
        </div>
        <div>
          <div className="kicker">{kicker}</div>
          <h1 className="headline mt-3 max-w-4xl text-4xl text-fg-primary sm:text-5xl lg:text-7xl">
            {title}
          </h1>
          {line && <p className="mb-0 mt-4 max-w-2xl text-lg text-fg-secondary">{line}</p>}
          {facts.length > 0 && (
            <dl className="mt-8 grid max-w-5xl grid-cols-2 gap-x-10 gap-y-4 sm:flex sm:flex-wrap">
              {facts.map((f) => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-fg-tertiary">{f.label}</dt>
                  <dd className="mb-0 mt-1 text-lg text-fg-primary">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {(primary || secondary) && (
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              {primary && (
                <Link href={primary.href} className="btn-frame">
                  {primary.label}
                </Link>
              )}
              {secondary && (
                <Link
                  href={secondary.href}
                  className="text-sm font-semibold text-fg-primary underline-offset-4 hover:underline"
                >
                  {secondary.label} →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      {photo && credit && (
        <a
          href={photo.page}
          className="absolute bottom-2 right-3 max-w-[70%] truncate text-xs text-fg-tertiary hover:text-fg-secondary"
          rel="noopener noreferrer"
        >
          {credit}
        </a>
      )}
    </section>
  );
}
