/**
 * What a page about a contested place shows (design:
 * docs/design/2026-11-contested-law.md §4.2): every place the world list says
 * another state claims, its two sides named from that list, and for every
 * question each side's own words, or the gap. A claimed place nobody has read
 * yet still has its page: every question a gap, which is the work in public.
 * Pure: the data comes in, nothing is fetched.
 */
import { CONTEST_TOPICS, CONTESTS } from "@/lib/config/places/contested";
import { placesConfig } from "@/lib/config/places";
import { WORLD, regionName, worldEntryOfPack, type WorldRegion } from "@/lib/config/world";
import { holderOfRegion } from "@/lib/budgets/holders";
import type { PlaceRef } from "@/lib/budgets/model";
import type { Contest, ContestProvision, ContestRole, ContestTopic } from "./contested";
import { localized } from "./place-view";
import { regionHref } from "./place-href";

export interface ContestSideView {
  key: string;
  role: ContestRole;
  name: string;
  /** The side's own page in Places. */
  href: string;
  /** The law register's key, when Solon holds that side's law. */
  lawAuthority: string | null;
  /** The world list's slug of the side's own place. */
  slug: string;
  /** How Places identifies the side's place, so its records (a budget) can be found. */
  holder: PlaceRef | null;
}

export interface ContestCell {
  side: string;
  /** Empty when nothing has been read for this side on this question. */
  provisions: ContestProvision[];
}

export interface ContestRow {
  key: string;
  label: string;
  question: string;
  cells: ContestCell[];
}

export interface ContestView {
  slug: string;
  name: string;
  sides: ContestSideView[];
  rows: ContestRow[];
  open: string | null;
  /** Questions with words from every side. */
  compared: number;
  topics: number;
}

export interface ContestData {
  contests: readonly Contest[];
  topics: readonly ContestTopic[];
  world: readonly WorldRegion[];
}

const DATA: ContestData = { contests: CONTESTS, topics: CONTEST_TOPICS, world: WORLD };

/** Where a side's page is: its pack's root, else where the world list has it. */
const sideHref = (region: WorldRegion) =>
  regionHref(
    region,
    region.code ? placesConfig.packs.find((p) => p.region === region.code)?.key : null,
  );

/** The world entries another state claims, in the world list's order. */
export const claimedRegions = (world: readonly WorldRegion[] = WORLD) =>
  world.filter((r) => r.claimedBy);

/** The world list's slug of a place pack, when the world list says another state claims it. */
export function contestSlugForPack(
  pack: { key: string; region?: string | null },
  world: readonly WorldRegion[] = WORLD,
): string | null {
  const entry = worldEntryOfPack(pack, world);
  return entry?.claimedBy ? entry.slug : null;
}

/** The comparison for a claimed place, by its world slug; null when the world list says no one claims it. */
export function contestView(
  slug: string,
  locale: string,
  data: ContestData = DATA,
): ContestView | null {
  const place = data.world.find((r) => r.slug === slug);
  if (!place?.claimedBy) return null;
  const claimant = data.world.find((r) => r.code === place.claimedBy);
  if (!claimant) return null;
  const contest = data.contests.find((c) => c.place === slug);
  const regionOf = (role: ContestRole) => (role === "governs" ? place : claimant);
  const sides: ContestSideView[] = (
    contest?.sides ?? [
      { key: "governs", role: "governs" as const, lawAuthority: null },
      { key: "claims", role: "claims" as const, lawAuthority: null },
    ]
  ).map((s) => ({
    key: s.key,
    role: s.role,
    name: regionName(regionOf(s.role), locale),
    href: sideHref(regionOf(s.role)),
    lawAuthority: s.lawAuthority,
    slug: regionOf(s.role).slug,
    holder: holderOfRegion(regionOf(s.role)),
  }));
  const rows = data.topics.map((topic) => ({
    key: topic.key,
    label: localized(topic.label, locale),
    question: localized(topic.question, locale),
    cells: sides.map((side) => ({
      side: side.key,
      provisions: (contest?.provisions ?? []).filter(
        (p) => p.topic === topic.key && p.side === side.key,
      ),
    })),
  }));
  return {
    slug,
    name: regionName(place, locale),
    sides,
    rows,
    open: contest?.open ? localized(contest.open, locale) : null,
    compared: rows.filter((r) => r.cells.every((c) => c.provisions.length > 0)).length,
    topics: data.topics.length,
  };
}

export interface ContestSummary {
  slug: string;
  name: string;
  claimant: string;
  compared: number;
  topics: number;
}

/** Every claimed place, with how far its comparison has got, for the index. */
export function contestSummaries(locale: string, data: ContestData = DATA): ContestSummary[] {
  return claimedRegions(data.world).flatMap((region) => {
    const view = contestView(region.slug, locale, data);
    const claimant = view?.sides.find((s) => s.role === "claims");
    return view && claimant
      ? [
          {
            slug: view.slug,
            name: view.name,
            claimant: claimant.name,
            compared: view.compared,
            topics: view.topics,
          },
        ]
      : [];
  });
}

/** What a page of a claimed place says about it: who claims it, and where the comparison is. */
export function contestNote(
  slug: string | null,
  locale: string,
  data: ContestData = DATA,
): { claimant: { name: string; href: string }; href: string } | null {
  const view = slug ? contestView(slug, locale, data) : null;
  const claimant = view?.sides.find((s) => s.role === "claims");
  return view && claimant
    ? {
        claimant: { name: claimant.name, href: claimant.href },
        href: `/places/contested/${view.slug}`,
      }
    : null;
}
