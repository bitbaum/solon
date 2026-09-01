/**
 * The single database door — Drizzle over a node-postgres pool (fleet house
 * pattern).
 *
 * Lazy initialization: the pool is created on first use, not at import time,
 * so `next build` and CI stay hermetic without a DATABASE_URL — the error only
 * fires when a route actually touches the database (and the server components
 * that do already catch it and render their fallback).
 *
 * Hot-reload-safe: in development the pool is stashed on globalThis so Next's
 * module reloads do not leak connections.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { solonDb: Db | undefined };

function getDb(): Db {
  if (globalForDb.solonDb) return globalForDb.solonDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — required for database operations");
  const db = drizzle(new Pool({ connectionString: url }), { schema });
  if (process.env.NODE_ENV !== "production") globalForDb.solonDb = db;
  return db;
}

/** Proxy that initializes the real client on first property access. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type Database = Db;
/** The transaction handle domain code receives inside db.transaction(). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
