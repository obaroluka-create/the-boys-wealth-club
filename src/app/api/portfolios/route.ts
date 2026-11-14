import * as ledger from "@/server/domain/ledger";
import { requireAdmin, route } from "@/server/http";

/** GET /api/portfolios */
export const GET = route(async (ctx) => {
  await requireAdmin(ctx);
  return ledger.listPortfolios(ctx.db);
});
