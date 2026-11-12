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

const isArticle = (path: string) => /^(?:art|par)_/.test(path);

/**
 * The headings to print above `current`: the new ones when it follows an article under the same
 * chapter, all of them when it stands on its own (an annex or the text of a promulgation), because the
 * page prints a heading again above each such block, even the same "II." twice in one page.
 */
export function headingsAbove(
  previous: { path: string; heading?: string; headingPath?: readonly string[] } | undefined,
  current: { path: string; headingPath?: readonly string[] },
): string[] {
  const path = current.headingPath ?? [];
  const same = previous && isArticle(previous.path) && isArticle(current.path);
  // A heading that is also the heading of the provision just before is that provision's own.
  return newHeadings(same ? previous.headingPath : undefined, path).filter(
    (h) => h !== previous?.heading,
  );
}
