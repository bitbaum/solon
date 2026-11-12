/**
 * Where the assistants' rate-limit windows live, so a deploy does not hand
 * everyone a fresh allowance and every instance counts against the same one.
 * Working state, not a record: a window nobody came back to is swept.
 */
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const rateLimitWindows = pgTable(
  "rate_limit_windows",
  {
    /** A keyed digest of the bucket and who asked; never the address itself. */
    key: text("key").primaryKey(),
    /** When each counted request arrived, epoch milliseconds, oldest first. */
    hits: jsonb("hits").$type<number[]>().notNull(),
    touchedAt: timestamp("touched_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("rate_limit_windows_touched_at_idx").on(t.touchedAt)],
);
