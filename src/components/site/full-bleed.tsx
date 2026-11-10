import type { ReactNode } from "react";
import { lightCounterpart, type Photo } from "@/lib/content/photos";
import ThemedPhoto from "./themed-photo";

/**
 * A full-screen section: one photograph, one statement, one way forward.
 *
 * The text sits bottom-left, where the scrim is heaviest, so it stays readable
 * whatever the photograph does. `under` slides the section beneath the header
 * — only the first section of a page should set it.
 *
 * The section follows the theme. A night photograph is shown by day as its
 * daylight counterpart (ThemedPhoto), under a scrim of the theme's page colour,
 * and the type on it keeps the theme's ink. `alwaysDark` is for a section whose
 * night photograph has no counterpart: it wears the dark theme in both, and a
 * page that passes both `under` and `alwaysDark` is listed in
 * HEADER_OVER_PHOTO_ROUTES, so the header above it is dark too.
 */
export default function FullBleed({
  photo,
  priority = false,
  under = false,
  position = "center",
  daylight = false,
  alwaysDark = false,
  children,
}: {
  photo: Photo;
  priority?: boolean;
  under?: boolean;
  /** CSS object-position — which part of the photograph survives a narrow screen. */
  position?: string;
  /** A bright photograph needs a heavier shade behind the text. */
  daylight?: boolean;
  /** Wear the dark theme whatever the reader chose: a night photograph with no daylight counterpart. */
  alwaysDark?: boolean;
  children: ReactNode;
}) {
  const strong = daylight || (!alwaysDark && lightCounterpart(photo) !== null);
  return (
    <section
      className={`${alwaysDark ? "dark" : ""} relative flex min-h-svh items-end overflow-hidden bg-surface-page ${under ? "-mt-nav" : ""}`}
    >
      <ThemedPhoto
        photo={photo}
        alwaysDark={alwaysDark}
        priority={priority}
        sizes="100vw"
        position={position}
      />
      <div className={`${strong ? "scrim-strong" : "scrim"} absolute inset-0`} aria-hidden="true" />
      {under && <div className="scrim-top absolute inset-x-0 top-0 h-40" aria-hidden="true" />}
      <div className="section-shell relative w-full pb-20 pt-40 md:pb-28">{children}</div>
    </section>
  );
}
