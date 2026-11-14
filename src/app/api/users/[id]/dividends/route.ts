import * as ledger from "@/server/domain/ledger";
import { idParam, readJson, requireAdmin, requireSelfOrAdmin, route } from "@/server/http";
import { dividendSchema } from "@/server/validation";

/** GET /api/users/:id/dividends */
export const GET = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  await requireSelfOrAdmin(ctx, id);
  return ledger.listDividends(ctx.db, id);
});

/** POST /api/users/:id/dividends → updated portfolio. */
export const POST = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  const admin = await requireAdmin(ctx);
  const input = await readJson(ctx.req, dividendSchema);
  return ledger.recordDividend(ctx.db, admin.user, id, input);
});
