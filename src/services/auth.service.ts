/**
 * Auth service
 *
 * Backend replacement:
 * POST /auth/login
 * POST /auth/logout
 * GET  /auth/session
 * POST /auth/password-reset
 */

import { ADMIN_HOME, USER_HOME } from "@/lib/constants";
import { DEMO_ADMIN_ID, DEMO_USER_ID } from "@/data/mock/seed";
import { platformDb } from "@/data/mock/db";
import { clearAccessToken, persistAccessToken, readAccessToken } from "@/lib/auth/session-store";
import { invalidateQueries } from "@/lib/query";
import type { LoginInput, LoginResult, Session, UserRole } from "@/types";
import { ApiError, callService } from "@/services/client";

function toSession(user: NonNullable<ReturnType<typeof platformDb.getUser>>): Session {
  return {
    userId: user.id,
    uuid: user.id,
    role: user.role,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    status: user.status,
  };
}

function assertActive(user: NonNullable<ReturnType<typeof platformDb.getUser>>) {
  if (user.status === "disabled") {
    throw new ApiError("This account is disabled. Contact your administrator.", 403);
  }
  if (user.status === "pending") {
    throw new ApiError("This account is pending activation.", 403);
  }
}

export function homeForRole(role: UserRole) {
  return role === "admin" ? ADMIN_HOME : USER_HOME;
}

export async function login(input: LoginInput): Promise<Session> {
  const result = await callService<LoginResult>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(input) },
    () => {
      const user = platformDb.verifyCredentials(input.identifier, input.password);
      if (!user) {
        throw new ApiError("The credentials entered could not be verified.", 401);
      }
      assertActive(user);
      return { session: toSession(user), token: platformDb.createSession(user.id) };
    },
    { skipAuthRedirect: true },
  );
  persistAccessToken(result.token, Boolean(input.rememberMe));
  return result.session;
}

export async function loginAsDemo(role: UserRole): Promise<Session> {
  const result = await callService<LoginResult>(
    `/auth/demo?role=${role}`,
    { method: "POST" },
    () => {
      const user = platformDb.getUser(role === "admin" ? DEMO_ADMIN_ID : DEMO_USER_ID);
      if (!user) throw new ApiError("Demo account is unavailable.", 500);
      return { session: toSession(user), token: platformDb.createSession(user.id) };
    },
    { skipAuthRedirect: true },
  );
  persistAccessToken(result.token, true);
  return result.session;
}

export async function logout(): Promise<void> {
  const token = readAccessToken();
  await callService<void>(
    "/auth/logout",
    { method: "POST" },
    () => {
      if (token) platformDb.revokeSession(token);
    },
    { skipAuthRedirect: true },
  );
  clearAccessToken();
}

export async function getSession(): Promise<Session | null> {
  return callService<Session | null>(
    "/auth/session",
    { method: "GET" },
    () => {
      const token = readAccessToken();
      if (!token) return null;
      const user = platformDb.resolveSession(token);
      if (!user || user.status === "disabled") {
        if (token) platformDb.revokeSession(token);
        clearAccessToken();
        return null;
      }
      return toSession(user);
    },
    { skipAuthRedirect: true },
  );
}

export async function requestPasswordReset(identifier: string): Promise<{ received: true }> {
  const result = await callService<{ received: true }>(
    "/auth/password-reset",
    { method: "POST", body: JSON.stringify({ identifier }) },
    () => platformDb.requestPasswordReset(identifier),
    { skipAuthRedirect: true },
  );
  invalidateQueries();
  return result;
}
