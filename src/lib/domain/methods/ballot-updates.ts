import type { MethodId } from "./types";

/**
 * Pure ballot edits.
 *
 * These live outside the component for one reason: every one of them must
 * derive the next ballot from the ballot it is *given*, never from a value
 * captured when the UI last rendered. Two taps landing in the same frame both
 * read the same rendered state, so a value-based edit silently drops the first
 * — a voter taps "+" five times and lands three dots. Keeping the arithmetic
 * here makes that property testable without a browser.
 */

type Dots = { allocations?: Record<string, number> };
type Approvals = { approved?: string[] };
type Scores = { scores?: Record<string, number> };
type Ranking = { ranking?: string[] };

const dotsOf = (b: unknown): Record<string, number> => ({ ...((b as Dots)?.allocations ?? {}) });
const approvedOf = (b: unknown): string[] => [...((b as Approvals)?.approved ?? [])];
const scoresOf = (b: unknown): Record<string, number> => ({ ...((b as Scores)?.scores ?? {}) });
const rankingOf = (b: unknown): string[] => [...((b as Ranking)?.ranking ?? [])];

export const spentDots = (b: unknown): number =>
  Object.values(dotsOf(b)).reduce((sum, n) => sum + (n || 0), 0);

/**
 * Add or remove one dot. Refuses to overspend, checked against the ballot it
 * was handed rather than the rendered one — otherwise a burst of taps each
 * sees the same stale "spent" and together they exceed the budget.
 */
export function nudgeDot(prev: unknown, key: string, by: number, budget: number): unknown {
  const allocations = dotsOf(prev);
  if (by > 0 && spentDots(prev) >= budget) return prev;
  const current = allocations[key] ?? 0;
  const next = Math.max(0, current + by);
  // An edit that changes nothing returns the ballot untouched, so decrementing
  // an unallocated option cannot leave a stray `key: 0` in the signed text.
  if (next === current) return prev;
  allocations[key] = next;
  return { method: "dot" as MethodId, allocations };
}

export function toggleApproval(prev: unknown, key: string): unknown {
  const approved = approvedOf(prev);
  return {
    method: "approval" as MethodId,
    approved: approved.includes(key) ? approved.filter((k) => k !== key) : [...approved, key],
  };
}

export function setScore(prev: unknown, key: string, value: number): unknown {
  const scores = scoresOf(prev);
  scores[key] = value;
  return { method: "score" as MethodId, scores };
}

export function addToRanking(prev: unknown, key: string): unknown {
  const ranking = rankingOf(prev);
  if (ranking.includes(key)) return prev;
  return { method: "ranked" as MethodId, ranking: [...ranking, key] };
}

export function removeFromRanking(prev: unknown, key: string): unknown {
  return {
    method: "ranked" as MethodId,
    ranking: rankingOf(prev).filter((k) => k !== key),
  };
}

/** Swap an entry with its neighbour. Out-of-range moves are a no-op, not a crash. */
export function moveInRanking(prev: unknown, index: number, by: number): unknown {
  const ranking = rankingOf(prev);
  const target = index + by;
  if (index < 0 || index >= ranking.length || target < 0 || target >= ranking.length) return prev;
  [ranking[index], ranking[target]] = [ranking[target], ranking[index]];
  return { method: "ranked" as MethodId, ranking };
}
