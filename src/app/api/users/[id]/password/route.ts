import * as auth from "@/server/domain/auth";
import { idParam, requireAdmin, route } from "@/server/http";

/** POST /api/users/:id/password → { temporaryPassword }; the user must change it at next sign-in. */
export const POST = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  const admin = await requireAdmin(ctx);
  return auth.issueTemporaryPassword(ctx.db, admin.user, id);
});
