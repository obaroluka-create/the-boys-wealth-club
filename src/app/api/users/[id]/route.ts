import * as users from "@/server/domain/users";
import { idParam, readJson, requireSelfOrAdmin, route } from "@/server/http";
import { updateUserSchema } from "@/server/validation";

/** GET /api/users/:id */
export const GET = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  await requireSelfOrAdmin(ctx, id);
  return users.getUser(ctx.db, id);
});

/** PATCH /api/users/:id — admins edit profile fields; investors may change only their photo. */
export const PATCH = route<{ id: string }>(async (ctx, params) => {
  const id = idParam(params.id);
  const authed = await requireSelfOrAdmin(ctx, id);
  const input = await readJson(ctx.req, updateUserSchema);
  return users.updateUser(ctx.db, authed.user, id, input);
});
