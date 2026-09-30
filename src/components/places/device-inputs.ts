"use client";

/**
 * The reader's situation for each pack's tax model (income, household, yes-or-no
 * inputs), shared by /compare and the map on /places. Kept for the tab only,
 * so moving between them keeps what the reader typed. It is never sent
 * anywhere: not in a link, not in a form, not to the server.
 */
import { useMemo, useSyncExternalStore } from "react";
import type { CompareTaxPack } from "@/lib/places/compare-view";

export interface PackInput {
  amount: string;
  variant: string;
  conditions: Record<string, boolean>;
}

const STORAGE_KEY = "solon.compare.inputs";

/**
 * The tab's inputs as a store: held in memory, mirrored to sessionStorage when
 * the browser allows it (private mode may not), and empty on the server.
 */
const listeners = new Set<() => void>();
let held: string | null | undefined;

function snapshot(): string {
  if (held === undefined) {
    try {
      held = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      held = null;
    }
  }
  return held ?? "{}";
}

function save(value: string) {
  held = value;
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Kept in memory for this page instead.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function parseSaved(json: string): Record<string, Partial<PackInput>> {
  try {
    const saved: unknown = JSON.parse(json);
    return typeof saved === "object" && saved !== null
      ? (saved as Record<string, Partial<PackInput>>)
      : {};
  } catch {
    return {};
  }
}

/** A pack's saved input, where it still fits the pack; the pack's defaults otherwise. */
function inputFor(pack: CompareTaxPack, saved: Partial<PackInput> | undefined): PackInput {
  return {
    amount: typeof saved?.amount === "string" ? saved.amount : "",
    variant:
      typeof saved?.variant === "string" && pack.variants.some((v) => v.key === saved.variant)
        ? saved.variant
        : (pack.variants[0]?.key ?? ""),
    conditions:
      typeof saved?.conditions === "object" && saved.conditions !== null ? saved.conditions : {},
  };
}

export function useDeviceInputs(packs: readonly CompareTaxPack[]) {
  const json = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const inputs = useMemo(() => {
    const saved = parseSaved(json);
    return Object.fromEntries(packs.map((pack) => [pack.key, inputFor(pack, saved[pack.key])]));
  }, [json, packs]);
  const update = (packKey: string, patch: Partial<PackInput>) =>
    save(
      JSON.stringify({
        ...parseSaved(snapshot()),
        [packKey]: { ...inputs[packKey]!, ...patch },
      }),
    );
  return [inputs, update] as const;
}
