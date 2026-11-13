import * as auth from "@/server/domain/auth";
import { readJson, route } from "@/server/http";
import { passwordResetSchema } from "@/server/validation";

/** POST /api/auth/password-reset → always { received: true }; administrators follow up. */
export const POST = route(async (ctx) => {
  const input = await readJson(ctx.req, passwordResetSchema);
  return auth.requestPasswordReset(ctx.db, input.identifier);
});
