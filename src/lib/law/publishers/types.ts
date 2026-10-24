/**
 * A publisher of municipal law (design: docs/design/2026-10-law-as-data.md,
 * "Municipal collections"). Every commune publishes in its own way, but what is
 * asked of each is the same four things, so a new commune is one adapter and one
 * line of config, and the loader, the store and the reading pages never change:
 *
 *   list      which acts the collection holds
 *   versions  an act's versions, each with the days the publisher says it applied
 *   document  where one version's text is, and in what format
 *   fetch     the bytes, politely
 */
import type { ActKind, ActTextStatus } from "@/lib/config/law";

export interface ListedAct {
  /** The collection's own number for the act, stable across versions. */
  ref: string;
  title: string;
  kind: ActKind;
  /** The act's page in the collection. */
  pageUrl: string;
}

export interface VersionRef {
  /** First day the version applied, YYYY-MM-DD, as the publisher states it. */
  inForceFrom: string;
  /** Last day, when the publisher states one. */
  inForceTo: string | null;
  /** The page that holds this version's document. */
  pageUrl: string;
}

export interface DocumentRef {
  url: string;
  format: "pdf" | "html";
}

export interface PublisherAdapter {
  key: string;
  /** Key in config LAW_AUTHORITIES. */
  authority: string;
  name: string;
  homepage: string;
  licenceSpdx: string;
  textStatus: ActTextStatus;
  locale: string;
  /** The collection's index: the bytes that were read (kept under their hash) and the acts they list. */
  list(doFetch: typeof fetch): Promise<{ bytes: Uint8Array; url: string; acts: ListedAct[] }>;
  versions(pageUrl: string, doFetch: typeof fetch): Promise<VersionRef[]>;
  document(version: VersionRef, doFetch: typeof fetch): Promise<DocumentRef | null>;
}
