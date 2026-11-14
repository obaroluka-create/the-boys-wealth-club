import * as ledger from "@/server/domain/ledger";
import { idParam, readJson, requireAdmin, requireSelfOrAdmin, route } from "@/server/http";
import { depositSchema } from "@/server/validation";

/** GET /api/users/:id/deposits */
export const GET = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  await requireSelfOrAdmin(ctx, id);
  return ledger.listDeposits(ctx.db, id);
});

/** POST /api/users/:id/deposits → updated portfolio. Buys units at the current price. */
export const POST = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  const admin = await requireAdmin(ctx);
  const input = await readJson(ctx.req, depositSchema);
  return ledger.recordDeposit(ctx.db, admin.user, id, input);
});
