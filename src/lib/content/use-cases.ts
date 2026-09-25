import type { CapabilityKey } from "./capabilities";
import { PHOTOS, type Photo } from "./photos";

/**
 * The groups Solon is for — one registry the home page, /for and each
 * /for/<slug> page read. Words live in messages `UseCases.<key>`; this holds
 * the structure: which photograph, which rule template fits, and which
 * capabilities the page shows with their real status.
 */
export interface UseCase {
  key: "companies" | "towns" | "associations" | "communities" | "networkStates";
  slug: string;
  photo: Photo;
  position: string;
  /** The governance profile that fits best (lib/config/governance-profiles.ts). */
  profile: "COMPANY" | "TOWN" | "ASSOCIATION" | "COOPERATIVE" | "COLLECTIVE";
  capabilities: CapabilityKey[];
}

export const USE_CASES: UseCase[] = [
  {
    key: "companies",
    slug: "companies",
    photo: PHOTOS.city,
    position: "center",
    profile: "COMPANY",
    capabilities: ["proposalsAndVotes", "signedVotes", "publicRecord", "ruleTemplates", "mandates"],
  },
  {
    key: "towns",
    slug: "towns",
    photo: PHOTOS.village,
    position: "center 45%",
    profile: "TOWN",
    capabilities: [
      "proposalsAndVotes",
      "countingMethods",
      "treasuryWatch",
      "bankLedger",
      "admissionByVote",
      "languages",
    ],
  },
  {
    key: "associations",
    slug: "associations",
    photo: PHOTOS.assemblySeated,
    position: "center 30%",
    profile: "ASSOCIATION",
    capabilities: [
      "proposalsAndVotes",
      "ruleTemplates",
      "governanceAgent",
      "admissionByVote",
      "bankLedger",
    ],
  },
  {
    key: "communities",
    slug: "communities",
    photo: PHOTOS.europeFromOrbit,
    position: "center",
    profile: "COLLECTIVE",
    capabilities: [
      "founding",
      "proposalsAndVotes",
      "countingMethods",
      "charterByVote",
      "exportAndFork",
    ],
  },
  {
    key: "networkStates",
    slug: "network-states",
    photo: PHOTOS.earthAtNight,
    position: "center 70%",
    profile: "TOWN",
    capabilities: [
      "founding",
      "signedVotes",
      "publicRecord",
      "treasuryWatch",
      "admissionByVote",
      "charterByVote",
      "federation",
      "exportAndFork",
    ],
  },
];

export const findUseCase = (slug: string) => USE_CASES.find((u) => u.slug === slug);
