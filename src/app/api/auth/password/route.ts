import * as auth from "@/server/domain/auth";
import { readJson, requireUser, route } from "@/server/http";
import { toSession } from "@/server/serialize";
import { getUserRow } from "@/server/domain/users";
import { changePasswordSchema } from "@/server/validation";

/** POST /api/auth/password → change the signed-in user's password; signs out other devices. */
export const POST = route(async (ctx) => {
  const authed = await requireUser(ctx, { allowPasswordChange: true });
  const input = await readJson(ctx.req, changePasswordSchema);
  await auth.changePassword(ctx.db, authed.user, authed.sessionId, input);
  return toSession(await getUserRow(ctx.db, authed.user.id));
});
