import * as auth from "@/server/domain/auth";
import { route } from "@/server/http";
import { toSession } from "@/server/serialize";

/** GET /api/auth/session → the current Session, or null when signed out. */
export const GET = route(async (ctx) => {
  const session = await auth.resolveSession(ctx.db, ctx.req.cookies.get(auth.SESSION_COOKIE)?.value);
  return session ? toSession(session.user) : null;
});
