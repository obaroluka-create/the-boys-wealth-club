import * as users from "@/server/domain/users";
import { idParam, readJson, requireAdmin, route } from "@/server/http";
import { statusSchema } from "@/server/validation";

/** PATCH /api/users/:id/status */
export const PATCH = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  const admin = await requireAdmin(ctx);
  const input = await readJson(ctx.req, statusSchema);
  return users.updateUser(ctx.db, admin.user, id, { status: input.status });
});
