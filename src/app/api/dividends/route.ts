import * as ledger from "@/server/domain/ledger";
import { requireAdmin, route } from "@/server/http";

/** GET /api/dividends → every recorded dividend. */
export const GET = route(async (ctx) => {
  await requireAdmin(ctx);
  return ledger.listDividends(ctx.db);
});
