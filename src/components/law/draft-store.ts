"use client";

/**
 * A draft kept for this tab: held in memory, mirrored to sessionStorage when
 * the browser allows it, empty on the server, so signing in halfway through
 * writing a proposal loses nothing. The same store shape as
 * src/components/places/device-inputs.ts; read with useSyncExternalStore, so
 * the server render and the first client render agree.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";

const held = new Map<string, string | null>();
const listeners = new Set<() => void>();

function snapshot(key: string): string {
  if (!held.has(key)) {
    try {
      held.set(key, sessionStorage.getItem(key));
    } catch {
      held.set(key, null);
    }
  }
  return held.get(key) ?? "";
}

function write(key: string, value: string | null) {
  held.set(key, value);
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
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

function parse<T>(raw: string): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * The draft under `key`, or `initial` while nothing is saved; a setter that
 * always starts from the latest saved value (so an answer that arrives late
 * does not undo what was typed meanwhile); and a way to clear it.
 */
export function useDraft<T>(
  key: string,
  initial: T,
): [T, (update: (prev: T) => T) => void, () => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => snapshot(key),
    () => "",
  );
  const value = useMemo(() => parse<T>(raw) ?? initial, [raw, initial]);
  const set = useCallback(
    (update: (prev: T) => T) =>
      write(key, JSON.stringify(update(parse<T>(snapshot(key)) ?? initial))),
    [key, initial],
  );
  const clear = useCallback(() => write(key, null), [key]);
  return [value, set, clear];
}
