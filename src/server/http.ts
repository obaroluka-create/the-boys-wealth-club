import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getDb, type Db } from "@/server/db/client";
import { SESSION_COOKIE, resolveSession, type UserRow } from "@/server/domain/auth";
import { HttpError, badRequest, forbidden, notFound, unauthorized } from "@/server/errors";
import { uuidParam } from "@/server/validation";

export interface RequestContext {
  req: NextRequest;
  db: Db;
}

export interface AuthedContext extends RequestContext {
  user: UserRow;
  sessionId: string;
}

type Handler<P> = (ctx: RequestContext, params: P) => Promise<unknown>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Reject cross-site writes: a browser always sends Origin on cross-site requests. */
function assertSameOrigin(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Cross-site request blocked.");
  }
  if (originHost !== host) throw forbidden("Cross-site request blocked.");
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ message: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json(
      { message: error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  console.error("[api] unhandled error", error);
  return Response.json({ message: "Something went wrong. Try again." }, { status: 500 });
}

/** Wrap a route handler: same-origin check, database access, JSON response, safe errors. */
export function route<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      assertSameOrigin(req);
      const db = await getDb();
      const params = await context.params;
      const result = await handler({ req, db }, params);
      if (result instanceof Response) return result;
      return Response.json(result ?? null, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** The signed-in user, or 401. Users who must change their password can only reach `allowPending` routes. */
export async function requireUser(
  ctx: RequestContext,
  options: { allowPasswordChange?: boolean } = {},
): Promise<AuthedContext> {
  const token = ctx.req.cookies.get(SESSION_COOKIE)?.value;
  const session = await resolveSession(ctx.db, token);
  if (!session) throw unauthorized("Your session has expired. Sign in again.");
  if (session.user.mustChangePassword && !options.allowPasswordChange) {
    throw forbidden("Change your temporary password to continue.");
  }
  return { ...ctx, user: session.user, sessionId: session.sessionId };
}

export async function requireAdmin(ctx: RequestContext): Promise<AuthedContext> {
  const authed = await requireUser(ctx);
  if (authed.user.role !== "admin") throw forbidden();
  return authed;
}

/** Investors may only read their own records; administrators may read anyone's. */
export async function requireSelfOrAdmin(ctx: RequestContext, userId: string) {
  const authed = await requireUser(ctx);
  if (authed.user.role !== "admin" && authed.user.id !== userId) throw forbidden();
  return authed;
}

/** A route `[id]` segment that must be a UUID; anything else is simply not found. */
export function idParam(value: string) {
  if (!uuidParam.safeParse(value).success) throw notFound();
  return value;
}

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw badRequest("Send the request body as JSON.");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("The request body is not valid JSON.");
  }
  return schema.parse(body);
}

export function readQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}

export function requestMeta(req: NextRequest) {
  return {
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
  };
}

export async function setSessionCookie(token: string, expiresAt: Date, remember: boolean) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Without "remember me" the cookie ends with the browser session (the server still expires it).
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
