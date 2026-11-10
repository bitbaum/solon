/**
 * What one authority's row on a place page says about its law, truthfully:
 * the acts Solon holds the text of (`acts`, which are in force), the acts the
 * register holds that are in force or whose status the publisher does not
 * state (`registered`), and the difference between them. "Texts not held yet"
 * is said only when the register holds acts whose texts are not held, so a
 * place with 1,849 registered acts and no texts reads as that, and never as
 * having nothing.
 */
export interface LawRowCounts {
  /** Acts in force whose text Solon holds. */
  acts: number;
  /** Acts registered that are in force or of unstated status (at least `acts` in practice). */
  registered: number;
}

export type LawRowKey = "count" | "registered" | "nothing" | "textsNotHeld" | "moreRegistered";

export interface LawRowText {
  /** The count on the right of the row. */
  label: { key: LawRowKey; count: number };
  /** One line under the name, when there is something to qualify. */
  detail: { key: LawRowKey; count: number } | null;
}

export function lawRowText({ acts, registered }: LawRowCounts): LawRowText {
  const known = Math.max(registered, acts);
  if (acts > 0) {
    return {
      label: { key: "count", count: acts },
      detail: known > acts ? { key: "moreRegistered", count: known - acts } : null,
    };
  }
  if (known > 0) {
    return {
      label: { key: "registered", count: known },
      detail: { key: "textsNotHeld", count: 0 },
    };
  }
  return { label: { key: "nothing", count: 0 }, detail: null };
}
