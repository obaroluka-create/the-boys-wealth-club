import * as ledger from "@/server/domain/ledger";
import { requireAdmin, route } from "@/server/http";

/** GET /api/transactions → platform-wide activity (latest 500). */
export const GET = route(async (ctx) => {
  await requireAdmin(ctx);
  return ledger.listTransactions(ctx.db);
});
