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
  /** Further amounts as typed, by input key (taxable wealth). */
  amounts: Record<string, string>;
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
    amounts: Object.fromEntries(
      pack.amounts.map((a) => {
        const typed = saved?.amounts?.[a.key];
        return [a.key, typeof typed === "string" ? typed : ""];
      }),
    ),
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
  /**
   * Write a change to every pack named, each taking only what it asks: an
   * amount or a yes-or-no it reads, a household it knows. One situation typed
   * once serves every country it fits.
   */
  const update = (packKeys: string | readonly string[], patch: Partial<PackInput>) => {
    const saved = parseSaved(snapshot());
    for (const key of typeof packKeys === "string" ? [packKeys] : packKeys) {
      const pack = packs.find((p) => p.key === key);
      const current = inputs[key];
      if (!pack || !current) continue;
      const asks = new Set([
        ...pack.amounts.map((a) => a.key),
        ...pack.conditions.map((c) => c.key),
        ...pack.choices.flatMap((c) => c.options.map((o) => o.key)),
      ]);
      const fits = <T>(values: Record<string, T>): Record<string, T> =>
        Object.fromEntries(Object.entries(values).filter(([k]) => asks.has(k)));
      saved[key] = {
        ...current,
        ...(patch.amount !== undefined && { amount: patch.amount }),
        ...(patch.amounts && { amounts: { ...current.amounts, ...fits(patch.amounts) } }),
        ...(patch.conditions && { conditions: fits(patch.conditions) }),
        ...(patch.variant !== undefined &&
          pack.variants.some((v) => v.key === patch.variant) && { variant: patch.variant }),
      };
    }
    save(JSON.stringify(saved));
  };
  return [inputs, update] as const;
}

/** A group's situation as its form shows it: the first pack's, with what the others ask added. */
export function groupInput(
  inputs: Record<string, PackInput>,
  packKeys: readonly string[],
): PackInput {
  const members = packKeys.flatMap((key) => (inputs[key] ? [inputs[key]] : []));
  const first = members[0]!;
  return {
    ...first,
    amounts: Object.assign({}, ...members.map((m) => m.amounts), first.amounts),
    conditions: Object.assign({}, ...members.map((m) => m.conditions), first.conditions),
  };
}
