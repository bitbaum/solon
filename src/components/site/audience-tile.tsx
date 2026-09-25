import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Photo } from "@/lib/content/photos";

/**
 * A photograph with a short statement over it — one audience, one line. With
 * `href` the whole tile is the link.
 */
export default function AudienceTile({
  title,
  body,
  photo,
  position = "center",
  href,
  more,
}: {
  title: string;
  body: string;
  photo: Photo;
  position?: string;
  href?: string;
  /** The link's call to action, shown when `href` is set. */
  more?: string;
}) {
  const alt = useTranslations("Photos");
  const inner = (
    <>
      <Image
        src={photo.image}
        alt={alt(photo.id)}
        fill
        placeholder="blur"
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        style={{ objectPosition: position }}
      />
      <div className="scrim absolute inset-0" aria-hidden="true" />
      <div className="relative p-7 sm:p-9">
        <h3 className="headline-caps text-3xl">{title}</h3>
        <p className="mt-3 max-w-sm text-fg-primary">{body}</p>
        {href && more && (
          <span className="mt-5 inline-block text-xs font-bold uppercase tracking-caps text-fg-primary underline underline-offset-4">
            {more}
          </span>
        )}
      </div>
    </>
  );
  const box = "group relative flex min-h-[26rem] items-end overflow-hidden bg-surface-public";
  return href ? (
    <Link href={href} className={box}>
      {inner}
    </Link>
  ) : (
    <div className={box}>{inner}</div>
  );
}
