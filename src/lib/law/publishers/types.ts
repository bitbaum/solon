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
  /** The collection's own handle for the act, stable across versions: a number, or an id in an address. */
  ref: string;
  /**
   * The number the collection itself gives the act (Zürich's 101.100), when its listing states one. Not the
   * `ref`: an id in an address is not a number a reader can cite, and is never shown as one.
   */
  number?: string | null;
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
  /**
   * `publisher` (the default) when the publisher states `inForceFrom`;
   * `retrieved` when it states no day and the day it was read stands in.
   */
  dateBasis?: "publisher" | "retrieved";
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
  /**
   * Where the document itself prints the act's number ("Akte Nr.: 01.01.03"): the first capture of this,
   * in the head of the document's text, is the act's number when the listing states none.
   */
  numberInDocument?: RegExp;
}
