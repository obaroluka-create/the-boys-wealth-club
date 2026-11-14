import * as auth from "@/server/domain/auth";
import { clearSessionCookie, route } from "@/server/http";

/** POST /api/auth/logout */
export const POST = route(async (ctx) => {
  await auth.logout(ctx.db, ctx.req.cookies.get(auth.SESSION_COOKIE)?.value);
  await clearSessionCookie();
  return null;
});
