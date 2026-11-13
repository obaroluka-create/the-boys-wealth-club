import * as ledger from "@/server/domain/ledger";
import { idParam, requireSelfOrAdmin, route } from "@/server/http";

/** GET /api/users/:id/portfolio */
export const GET = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  await requireSelfOrAdmin(ctx, id);
  return ledger.getPortfolio(ctx.db, id);
});
