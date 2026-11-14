import * as ledger from "@/server/domain/ledger";
import { idParam, requireSelfOrAdmin, route } from "@/server/http";

/** GET /api/users/:id/transactions → activity history for one user (latest 500). */
export const GET = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  await requireSelfOrAdmin(ctx, id);
  return ledger.listTransactions(ctx.db, id);
});
