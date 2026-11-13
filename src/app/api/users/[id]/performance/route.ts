import * as ledger from "@/server/domain/ledger";
import { idParam, readQuery, requireSelfOrAdmin, route } from "@/server/http";
import { rangeSchema } from "@/server/validation";

/** GET /api/users/:id/performance?range=1M|3M|6M|1Y|ALL */
export const GET = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  await requireSelfOrAdmin(ctx, id);
  const { range = "ALL" } = readQuery(ctx.req, rangeSchema);
  return ledger.getPerformance(ctx.db, id, range);
});
