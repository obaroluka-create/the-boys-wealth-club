/**
 * Apply database migrations.
 *   npm run db:migrate
 * Uses DATABASE_URL (postgres://…), or the local PGlite database when unset.
 */
import { migrateDatabase } from "@/server/db/client";

await migrateDatabase();
console.log("Database is up to date.");
