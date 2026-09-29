/**
 * A seat points at a person; the person lives on OrangeCat.
 *
 * Solon never builds profiles of its own (the fleet's identity root does
 * that). What it keeps per member is the least that lets a reader get from a
 * roster to the human behind it: the OrangeCat handle and picture, refreshed
 * from the id token every time the member signs in. The display name is NOT
 * refreshed — it is the name they chose for this roster, and a rename on
 * OrangeCat must not silently rewrite a governance record.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { members } from "@/lib/db/schema";

export interface OrangeCatFace {
  username: string | null;
  avatarUrl: string | null;
}

const ISSUER = (process.env.ORANGECAT_OAUTH_ISSUER ?? "https://orangecat.ch").replace(/\/$/, "");

/** Public OrangeCat profile for a handle; null when the account has none yet. */
export function orangecatProfileUrl(
  username: string | null | undefined,
  issuer = ISSUER,
): string | null {
  if (!username || !/^[a-z0-9_-]{1,40}$/i.test(username)) return null;
  return `${issuer.replace(/\/$/, "")}/profiles/${encodeURIComponent(username)}`;
}

/** What the id token says, in Solon's terms. Pure. */
export function faceFromClaims(claims: {
  preferred_username?: string | null;
  picture?: string | null;
}): OrangeCatFace {
  const username =
    typeof claims.preferred_username === "string" ? claims.preferred_username.trim() : "";
  const avatar = typeof claims.picture === "string" ? claims.picture.trim() : "";
  return {
    username: username || null,
    avatarUrl: /^https:\/\//.test(avatar) ? avatar : null,
  };
}

/** True when the stored face differs from what OrangeCat says now. Pure. */
export function faceChanged(
  stored: { ocUsername: string | null; avatarUrl: string | null },
  face: OrangeCatFace,
): boolean {
  return stored.ocUsername !== face.username || stored.avatarUrl !== face.avatarUrl;
}

/**
 * Refresh every seat this actor holds. Cheap (one indexed update), safe to
 * call on every account-page render; returns how many rows changed.
 */
export async function syncMemberFace(actorId: string, face: OrangeCatFace): Promise<number> {
  const rows = await db.query.members.findMany({
    where: eq(members.ocActorId, actorId),
    columns: { id: true, ocUsername: true, avatarUrl: true },
  });
  const stale = rows.filter((r) => faceChanged(r, face));
  for (const row of stale) {
    await db
      .update(members)
      .set({ ocUsername: face.username, avatarUrl: face.avatarUrl })
      .where(eq(members.id, row.id));
  }
  return stale.length;
}
