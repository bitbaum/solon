/**
 * Ask OrangeCat whether an organisation there exists and who owns it.
 *
 * Binding a Solon organization to an OrangeCat group makes two records one
 * body: the wallet lives there, the decisions live here. The binding is by
 * PROOF — OrangeCat names the owning actor, Solon compares it with the
 * founder's session — never by a typed id, so nobody binds a body they do not
 * own. OrangeCat's endpoint is public and returns only public groups, so
 * nothing private crosses over.
 */
import { ECOSYSTEM_PILLARS } from "@/lib/config/ecosystem";
import {
  isCollectiveKindId,
  normalizePlace,
  type CollectiveKindId,
  type Place,
} from "@/lib/collective-kinds";

export interface OrangeCatGroup {
  id: string;
  slug: string;
  name: string;
  kind: CollectiveKindId;
  place: Place | null;
  ownerActorId: string;
}

export type OrangeCatGroupLookup =
  { ok: true; group: OrangeCatGroup } | { ok: false; reason: string };

const ORANGECAT_URL =
  process.env.ORANGECAT_URL ?? ECOSYSTEM_PILLARS.find((p) => p.key === "orangecat")!.url;
const TIMEOUT_MS = 8_000;

/** The shape OrangeCat's /api/v1/groups/<slug>/binding returns, checked field by field. */
function parse(raw: unknown): OrangeCatGroup | null {
  const d = (raw as { data?: Record<string, unknown> } | null)?.data ?? raw;
  if (!d || typeof d !== "object") return null;
  const g = d as Record<string, unknown>;
  if (typeof g.id !== "string" || typeof g.slug !== "string" || typeof g.name !== "string") {
    return null;
  }
  if (typeof g.owner_actor_id !== "string" || !isCollectiveKindId(g.label)) return null;
  const place = normalizePlace(
    g.place && typeof g.place === "object" ? (g.place as Partial<Place>) : null,
  );
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    kind: g.label,
    place,
    ownerActorId: g.owner_actor_id,
  };
}

export async function fetchOrangeCatGroup(
  slug: string,
  fetcher: typeof fetch = fetch,
): Promise<OrangeCatGroupLookup> {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(clean)) {
    return { ok: false, reason: "that is not an OrangeCat organisation address" };
  }
  try {
    const res = await fetcher(
      `${ORANGECAT_URL}/api/v1/groups/${encodeURIComponent(clean)}/binding`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (res.status === 404) {
      return { ok: false, reason: `OrangeCat has no public organisation at "${clean}"` };
    }
    if (!res.ok) return { ok: false, reason: `OrangeCat answered ${res.status}` };
    const group = parse(await res.json());
    return group
      ? { ok: true, group }
      : { ok: false, reason: "OrangeCat's answer did not name an owner" };
  } catch {
    return { ok: false, reason: "OrangeCat could not be reached — try again in a moment" };
  }
}

export { parse as parseOrangeCatGroup };
