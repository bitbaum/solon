/** The rows of a raw `db.execute` result, whichever shape the driver returns them in. */
export const rowsOf = <T>(result: unknown): T[] =>
  ((result as { rows?: T[] }).rows ?? (result as T[])) as T[];
