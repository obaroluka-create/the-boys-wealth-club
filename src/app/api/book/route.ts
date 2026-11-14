import * as ledger from "@/server/domain/ledger";
import { readJson, requireAdmin, requireUser, route } from "@/server/http";
import { bookUpdateSchema } from "@/server/validation";

/** GET /api/book → current unit price and launch details. */
export const GET = route(async (ctx) => {
  await requireUser(ctx);
  return ledger.getBook(ctx.db);
});

/** PATCH /api/book { profitPercent, lossPercent } → moves the unit price for every investor. */
export const PATCH = route(async (ctx) => {
  const admin = await requireAdmin(ctx);
  const input = await readJson(ctx.req, bookUpdateSchema);
  return ledger.updateBook(ctx.db, admin.user, input);
});
