import * as users from "@/server/domain/users";
import { readJson, readQuery, requireAdmin, route } from "@/server/http";
import { createUserSchema, userQuerySchema } from "@/server/validation";

/** GET /api/users → Paginated<UserAccountRow> (investors only). */
export const GET = route(async (ctx) => {
  await requireAdmin(ctx);
  return users.listUsers(ctx.db, readQuery(ctx.req, userQuerySchema));
});

/** POST /api/users → { user, temporaryPassword } */
export const POST = route(async (ctx) => {
  const admin = await requireAdmin(ctx);
  const input = await readJson(ctx.req, createUserSchema);
  return users.createUser(ctx.db, admin.user, input);
});
