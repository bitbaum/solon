/**
 * The chapter and section headings above a provision, outermost first ("II. Zulassung und Pflichten",
 * "A. Allgemeines"). A heading is not a provision and has no path of its own; it is held on the
 * provisions under it.
 */

/**
 * The headings a reader meets again at `path` that `previous` (the provision before it) did not have:
 * from the first level that differs inward. A page prints each heading once, above the first article
 * under it.
 */
export function newHeadings(
  previous: readonly string[] | undefined,
  path: readonly string[],
): string[] {
  let i = 0;
  while (i < path.length && previous && previous[i] === path[i]) i++;
  return path.slice(i);
}
