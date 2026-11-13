import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/server/db/schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/**
 * Database connection.
 *
 * - `DATABASE_URL=postgres://…` connects to PostgreSQL (required in production).
 * - Unset (development only) uses an embedded PGlite database stored in
 *   `.data/pglite`, migrated automatically on first use.
 */
export async function openDatabase(url = process.env.DATABASE_URL): Promise<Db> {
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 10 });
    return drizzle(client, { schema }) as unknown as Db;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be a postgres:// connection string in production.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = url?.startsWith("pglite:")
    ? url.slice("pglite:".length)
    : path.join(process.cwd(), ".data", "pglite");
  if (!dataDir.includes("://")) mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Db;
}

/** Close a connection opened with `openDatabase` (scripts and tests). */
export async function closeDatabase(db: Db) {
  const client = (db as unknown as { $client?: { end?: () => Promise<void>; close?: () => Promise<void> } })
    .$client;
  if (client?.end) await client.end();
  else if (client?.close) await client.close();
}

/** Apply pending migrations to a PostgreSQL database (PGlite databases migrate on open). */
export async function migrateDatabase(url = process.env.DATABASE_URL) {
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 1 });
    try {
      await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
    } finally {
      await client.end();
    }
    return;
  }
  await closeDatabase(await openDatabase(url));
}

// One connection per server process; kept on globalThis so dev reloads reuse it.
const globalForDb = globalThis as unknown as { tbwcDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.tbwcDb ??= openDatabase();
  return globalForDb.tbwcDb;
}
