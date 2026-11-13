import * as auth from "@/server/domain/auth";
import { readJson, requestMeta, route, setSessionCookie } from "@/server/http";
import { toSession } from "@/server/serialize";
import { loginSchema } from "@/server/validation";

/** POST /api/auth/login → { session }. The token is set as an httpOnly cookie. */
export const POST = route(async (ctx) => {
  const input = await readJson(ctx.req, loginSchema);
  const result = await auth.login(ctx.db, input, requestMeta(ctx.req));
  await setSessionCookie(result.token, result.expiresAt, result.remember);
  return { session: toSession(result.user) };
});
