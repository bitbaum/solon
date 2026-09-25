import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Photo } from "@/lib/content/photos";

/**
 * A full-screen section: one photograph, one statement, one way forward.
 *
 * The text sits bottom-left, where the scrim is darkest, so it stays readable
 * whatever the photograph does. `under` slides the section beneath the header
 * — only the first section of a page should set it.
 */
export default function FullBleed({
  photo,
  priority = false,
  under = false,
  position = "center",
  daylight = false,
  children,
}: {
  photo: Photo;
  priority?: boolean;
  under?: boolean;
  /** CSS object-position — which part of the photograph survives a narrow screen. */
  position?: string;
  /** A bright photograph needs a heavier shade behind the text. */
  daylight?: boolean;
  children: ReactNode;
}) {
  const alt = useTranslations("Photos");
  return (
    <section
      className={`relative flex min-h-svh items-end overflow-hidden bg-surface-public ${under ? "-mt-nav" : ""}`}
    >
      <Image
        src={photo.image}
        alt={alt(photo.id)}
        fill
        priority={priority}
        placeholder="blur"
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: position }}
      />
      <div
        className={`${daylight ? "scrim-strong" : "scrim"} absolute inset-0`}
        aria-hidden="true"
      />
      {under && <div className="scrim-top absolute inset-x-0 top-0 h-40" aria-hidden="true" />}
      <div className="section-shell relative w-full pb-20 pt-40 md:pb-28">{children}</div>
    </section>
  );
}
