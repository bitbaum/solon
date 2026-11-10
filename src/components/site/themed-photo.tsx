import Image from "next/image";
import { useTranslations } from "next-intl";
import { lightCounterpart, type Photo } from "@/lib/content/photos";

/**
 * A photograph that follows the theme. A night photograph with a daylight
 * counterpart (`lightCounterpart`) is drawn as both, and CSS shows the one
 * that matches the theme in force; any other photograph is drawn once.
 * `alwaysDark` keeps the night photograph in both themes, for a section that
 * wears the dark theme itself.
 */
export default function ThemedPhoto({
  photo,
  alwaysDark = false,
  priority = false,
  sizes,
  position,
  className = "",
}: {
  photo: Photo;
  alwaysDark?: boolean;
  priority?: boolean;
  sizes: string;
  position: string;
  className?: string;
}) {
  const alt = useTranslations("Photos");
  const light = alwaysDark ? null : lightCounterpart(photo);
  const draw = (p: Photo, extra: string, eager: boolean) => (
    <Image
      src={p.image}
      alt={alt(p.id)}
      fill
      priority={eager}
      placeholder="blur"
      sizes={sizes}
      className={`object-cover ${className} ${extra}`}
      style={{ objectPosition: position }}
    />
  );
  if (!light) return draw(photo, "", priority);
  // Two images, one shown: neither is preloaded, so a reader is not sent both.
  return (
    <>
      {draw(photo, "photo-for-dark", false)}
      {draw(light, "photo-for-light", false)}
    </>
  );
}
