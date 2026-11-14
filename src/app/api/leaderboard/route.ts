import * as ledger from "@/server/domain/ledger";
import { requireUser, route } from "@/server/http";

/** GET /api/leaderboard → ranks and balances by UUID only; never names or emails. */
export const GET = route(async (ctx) => {
  await requireUser(ctx);
  return ledger.getLeaderboard(ctx.db);
});
