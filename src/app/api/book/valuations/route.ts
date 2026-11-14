import * as ledger from "@/server/domain/ledger";
import { requireAdmin, route } from "@/server/http";

/** GET /api/book/valuations → price history, newest first. */
export const GET = route(async (ctx) => {
  await requireAdmin(ctx);
  return ledger.listValuations(ctx.db);
});
