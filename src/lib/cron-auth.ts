import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Whether a request carries the box's cron secret (`Authorization: Bearer
 * <CRON_SECRET>`, sent by the box's appcron runner). No secret configured
 * means no request is let in, rather than every one.
 */
export function isCronRequest(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization?.startsWith("Bearer ")) {
    return false;
  }
  // Hashed first so both sides have the same length and timingSafeEqual cannot throw.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(authorization.slice("Bearer ".length)), digest(secret));
}
