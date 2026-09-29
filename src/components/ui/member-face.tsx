import Image from "next/image";
import { orangecatProfileUrl } from "@/lib/domain/member-identity";

/**
 * A member's picture and handle, linking to the person on OrangeCat. Renders
 * a monogram when there is no picture, and no link when there is no handle:
 * a seat without a linked account is still a seat.
 */
export function MemberFace({
  name,
  username,
  avatarUrl,
  size = 32,
}: {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  size?: number;
}) {
  const href = orangecatProfileUrl(username);
  const face = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt=""
      width={size}
      height={size}
      className="rounded-pill border border-default object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-pill border border-default bg-surface-raised text-xs font-semibold text-fg-secondary"
      style={{ width: size, height: size }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
  if (!href) return face;
  return (
    <a
      href={href}
      className="inline-flex shrink-0"
      title={`@${username} on OrangeCat`}
      rel="noopener"
    >
      {face}
    </a>
  );
}
