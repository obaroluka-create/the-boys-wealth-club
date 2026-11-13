import { createHash, randomBytes, randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt, ne, or } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { audit } from "@/server/domain/audit";
import { HttpError, badRequest, notFound, unauthorized } from "@/server/errors";
import { passwordPolicyError } from "@/lib/password-policy";

export type UserRow = typeof users.$inferSelect;

export const SESSION_COOKIE = "tbwc_session";

/** "Remember me" sessions last 30 days; others 12 hours (and the cookie ends with the browser). */
export const REMEMBERED_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const SHORT_SESSION_MS = 12 * 60 * 60 * 1000;

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

// Verified against when no account matches, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | null = null;

export function hashPassword(password: string) {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function assertPasswordPolicy(password: string) {
  const problem = passwordPolicyError(password);
  if (problem) throw badRequest(problem);
}

/** Readable temporary password for an administrator to hand over, e.g. "Kp7m-Qx3r-Tz9w". */
export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const group = () =>
    alphabet[randomInt(alphabet.length)] +
    alphabet[randomInt(alphabet.length)] +
    digits[randomInt(digits.length)] +
    alphabet[randomInt(alphabet.length)];
  return `${group()}-${group()}-${group()}`;
}

export async function findUserByIdentifier(db: Db, identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (!value) return null;
  const [row] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, value), eq(users.username, value)))
    .limit(1);
  return row ?? null;
}

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createSession(db: Db, userId: string, remember: boolean, meta: RequestMeta) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? REMEMBERED_SESSION_MS : SHORT_SESSION_MS));
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
  });
  return { token, expiresAt };
}

const INVALID_CREDENTIALS = "The credentials entered could not be verified.";

export async function login(
  db: Db,
  input: { identifier: string; password: string; rememberMe?: boolean },
  meta: RequestMeta = {},
) {
  const user = await findUserByIdentifier(db, input.identifier);
  if (!user) {
    dummyHash ??= hashPassword("timing-equaliser-password-1");
    await verifyPassword(await dummyHash, input.password);
    throw unauthorized(INVALID_CREDENTIALS);
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new HttpError(
      429,
      "Too many failed sign-in attempts. Try again in a few minutes or contact your administrator.",
    );
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db
      .update(users)
      .set({
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MS) : null,
      })
      .where(eq(users.id, user.id));
    throw unauthorized(INVALID_CREDENTIALS);
  }

  if (user.status === "disabled") {
    throw new HttpError(403, "This account is disabled. Contact your administrator.");
  }
  if (user.status === "pending") {
    throw new HttpError(403, "This account is pending activation.");
  }

  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null })
    .where(eq(users.id, user.id));
  const session = await createSession(db, user.id, Boolean(input.rememberMe), meta);
  return { user, ...session, remember: Boolean(input.rememberMe) };
}

/** The signed-in user for a session token, or null if the session is missing, expired or the account is inactive. */
export async function resolveSession(db: Db, token: string | undefined | null) {
  if (!token) return null;
  const id = hashToken(token);
  const now = new Date();
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row || row.user.status !== "active") return null;

  if (now.getTime() - row.session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id));
  }
  return { user: row.user, sessionId: id };
}

export async function logout(db: Db, token: string | undefined | null) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function revokeSessions(db: Db, userId: string, exceptSessionId?: string) {
  await db
    .delete(sessions)
    .where(
      exceptSessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
        : eq(sessions.userId, userId),
    );
}

export async function changePassword(
  db: Db,
  user: UserRow,
  sessionId: string,
  input: { currentPassword: string; newPassword: string },
) {
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw badRequest("The current password is incorrect.");
  }
  assertPasswordPolicy(input.newPassword);
  if (input.newPassword === input.currentPassword) {
    throw badRequest("Choose a password different from the current one.");
  }
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(input.newPassword),
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  // Sign out every other device.
  await revokeSessions(db, user.id, sessionId);
  await audit(db, { actorId: user.id, subjectUserId: user.id, action: "password_changed" });
}

/** Public reset request: recorded for administrators; the response never reveals whether the account exists. */
export async function requestPasswordReset(db: Db, identifier: string) {
  const user = await findUserByIdentifier(db, identifier);
  if (user) {
    await audit(db, {
      subjectUserId: user.id,
      action: "password_reset_requested",
      note: "Password reset requested. An administrator will issue new credentials.",
    });
  }
  return { received: true as const };
}

/** Administrator issues a new temporary password; the user must change it at next sign-in. */
export async function issueTemporaryPassword(db: Db, actor: UserRow, userId: string) {
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) throw notFound("User not found.");
  const temporaryPassword = generateTemporaryPassword();
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await revokeSessions(db, userId);
  await audit(db, { actorId: actor.id, subjectUserId: userId, action: "password_reset_issued" });
  return { temporaryPassword };
}
