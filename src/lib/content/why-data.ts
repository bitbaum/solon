/**
 * What /statistics/why claims, section by section, and where each claim is
 * live. A capability's status is read from capabilities.ts
 * (`DATA_CAPABILITIES`); the worked example's from here, each with the page it
 * rests on. Words live in messages (`Statistics.why`).
 */
import type { ItemStatus } from "@/components/site/status-list";
import type { DataCapabilityKey as CapabilityKey } from "./capabilities";

export const WHY_SECTIONS = [
  { key: "why", capabilities: ["lawByPlace", "statisticsSeries", "publicBudgets"] },
  { key: "gaps", capabilities: ["measurementGaps", "placeGapReport"] },
  { key: "trends", capabilities: ["lawEvents", "trendMarkers", "policyByTrend"] },
] as const satisfies readonly { key: string; capabilities: readonly CapabilityKey[] }[];

/** Where each live capability can be seen. */
export const CAPABILITY_HREF: Partial<Record<CapabilityKey, string>> = {
  lawByPlace: "/law/coverage",
  statisticsSeries: "/statistics",
  publicBudgets: "/budgets",
  measurementGaps: "/statistics/gaps",
  lawEvents: "/statistics/events",
  aiResearch: "/statistics/research",
  groupMeasures: "/statistics",
};

/**
 * South Ossetia, the worked example. "available" is on Solon's pages today;
 * "researched" was read from the publisher and written down in the research
 * note, not yet loaded; "planned" is not built.
 */
export const WORKED_EXAMPLE = [
  { key: "law", status: "available", href: "/places/south-ossetia" },
  { key: "budget", status: "available", href: "/budgets/south-ossetia" },
  { key: "statistics", status: "researched" },
  { key: "gaps", status: "researched" },
  { key: "next", status: "planned" },
] as const satisfies readonly { key: string; status: ItemStatus; href?: string }[];

/** Pages read for the explainer's own sentences, each with the day it was read. */
export const WHY_SOURCES = {
  /** Statistics Denmark's table of persons guilty, by country of origin, sex and age, 2000–2025. */
  denmark: {
    url: "https://api.statbank.dk/v1/tableinfo/STRAFNA3?lang=en&format=JSON",
    read: "2026-11-10",
  },
  /** France's Constitutional Council, decision 2007-557 DC, para. 29. */
  france: {
    url: "https://www.conseil-constitutionnel.fr/decision/2007/2007557DC.htm",
    read: "2026-11-10",
  },
  /** Georgia's statistics office: from 1994 its data do not cover the Tskhinvali region. */
  geostat: {
    url: "https://www.geostat.ge/media/73533/2024-VS-Report-(eng).pdf",
    read: "2026-11-11",
  },
  /** The South Ossetian statistics office's list of compendia; 2025 posted 2026-06-24. */
  ugosstat: {
    url: "https://ugosstat.ru/statisticheskij-sbornik-za-2025-god/",
    read: "2026-11-11",
  },
  /** Everything read about South Ossetia, with addresses and days. */
  researchNote: {
    url: "https://github.com/bitbaum/solon/blob/main/docs/research/2026-11-south-ossetia-sources.md",
    read: "2026-11-10",
  },
} as const;
