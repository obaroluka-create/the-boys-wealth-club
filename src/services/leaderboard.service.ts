/**
 * Leaderboard entries expose UUIDv4 identifiers and current balances only.
 * Never join names or emails here — privacy is enforced at the service boundary.
 */

import { platformDb } from "@/data/mock/db";
import { callService } from "@/services/client";
import type { LeaderboardEntry } from "@/types";

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return callService("/leaderboard", { method: "GET" }, () => platformDb.getLeaderboard());
}
