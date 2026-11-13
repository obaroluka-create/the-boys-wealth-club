import { and, eq, ne } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { audit } from "@/server/domain/audit";
import {
  generateTemporaryPassword,
  hashPassword,
  revokeSessions,
  type UserRow,
} from "@/server/domain/auth";
import { openPortfolio, portfoliosByUser } from "@/server/domain/ledger";
import { badRequest, conflict, forbidden, notFound } from "@/server/errors";
import { toUser } from "@/server/serialize";
import type {
  AccountStatus,
  Paginated,
  User,
  UserAccountRow,
  UserQuery,
} from "@/types";

/** Profile photos are stored inline for now; cap them at roughly a 2 MB image. */
const MAX_IMAGE_URL_LENGTH = 2_800_000;

export async function getUserRow(db: Db, id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) throw notFound("User not found.");
  return row;
}

export async function getUser(db: Db, id: string): Promise<User> {
  return toUser(await getUserRow(db, id));
}

async function assertEmailAvailable(db: Db, email: string, exceptId?: string) {
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(exceptId ? and(eq(users.email, email), ne(users.id, exceptId)) : eq(users.email, email))
    .limit(1);
  if (taken) throw conflict("Another account already uses this email.");
}

async function uniqueUsername(db: Db, email: string) {
  const base = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "investor";
  const existing = new Set(
    (await db.select({ username: users.username }).from(users)).map((row) => row.username),
  );
  let candidate = base;
  for (let suffix = 2; existing.has(candidate); suffix += 1) candidate = `${base}${suffix}`;
  return candidate;
}

export async function listUsers(db: Db, query: UserQuery): Promise<Paginated<UserAccountRow>> {
  const {
    search = "",
    status = "all",
    sortBy = "name",
    sortDir = "asc",
    page = 1,
    pageSize = 8,
  } = query;

  const [rows, portfolioMap] = await Promise.all([
    db.select().from(users).where(eq(users.role, "user")),
    portfoliosByUser(db),
  ]);
  let items: UserAccountRow[] = rows.map((row) => {
    const portfolio = portfolioMap.get(row.id) ?? null;
    return {
      user: toUser(row),
      portfolio,
      performancePercentage:
        portfolio && portfolio.totalDeposit > 0
          ? ((portfolio.currentBalance - portfolio.totalDeposit) / portfolio.totalDeposit) * 100
          : 0,
    };
  });

  if (status !== "all") items = items.filter((item) => item.user.status === status);
  const term = search.trim().toLowerCase();
  if (term) {
    items = items.filter(
      (item) =>
        item.user.fullName.toLowerCase().includes(term) ||
        item.user.email.includes(term) ||
        item.user.username.includes(term) ||
        item.user.id.includes(term) ||
        item.portfolio?.reference.toLowerCase().includes(term),
    );
  }

  const dir = sortDir === "asc" ? 1 : -1;
  items.sort((a, b) => {
    if (sortBy === "investment") {
      return ((a.portfolio?.totalDeposit ?? 0) - (b.portfolio?.totalDeposit ?? 0)) * dir;
    }
    if (sortBy === "balance") {
      return ((a.portfolio?.currentBalance ?? 0) - (b.portfolio?.currentBalance ?? 0)) * dir;
    }
    return a.user.fullName.localeCompare(b.user.fullName) * dir;
  });

  const safePage = Math.max(1, page);
  const safeSize = Math.min(Math.max(1, pageSize), 100);
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    total: items.length,
    page: safePage,
    pageSize: safeSize,
  };
}

/** Admin issues an investor account with an opening deposit and a one-time password. */
export async function createUser(
  db: Db,
  actor: UserRow,
  input: { fullName: string; email: string; totalDeposit: number; status: AccountStatus; id?: string },
) {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName || !email) throw badRequest("Full name and email are required.");
  if (!(input.totalDeposit > 0)) throw badRequest("Total deposit must be greater than zero.");

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const created = await db.transaction(async (tx) => {
    await assertEmailAvailable(tx, email);
    const [row] = await tx
      .insert(users)
      .values({
        ...(input.id ? { id: input.id } : {}),
        fullName,
        email,
        username: await uniqueUsername(tx, email),
        role: "user",
        status: input.status,
        passwordHash,
        mustChangePassword: true,
      })
      .returning();
    await openPortfolio(tx, actor, row.id, input.totalDeposit);
    return row;
  });

  return { user: toUser(created), temporaryPassword };
}

export async function updateUser(
  db: Db,
  actor: UserRow,
  id: string,
  input: { fullName?: string; email?: string; status?: AccountStatus; imageUrl?: string },
): Promise<User> {
  const isAdmin = actor.role === "admin";
  if (!isAdmin) {
    // Investors may only change their own photo.
    if (actor.id !== id) throw forbidden();
    if (input.fullName !== undefined || input.email !== undefined || input.status !== undefined) {
      throw forbidden("Only an administrator can change these details.");
    }
  }
  if (input.imageUrl !== undefined) {
    const value = input.imageUrl;
    if (value && !value.startsWith("data:image/") && !value.startsWith("https://")) {
      throw badRequest("Upload an image file.");
    }
    if (value.length > MAX_IMAGE_URL_LENGTH) throw badRequest("Use an image smaller than 2 MB.");
  }

  const current = await getUserRow(db, id);
  const fullName = input.fullName?.trim() ?? current.fullName;
  const email = input.email?.trim().toLowerCase() ?? current.email;
  if (!fullName) throw badRequest("Full name is required.");
  if (!email) throw badRequest("Email is required.");
  if (email !== current.email) await assertEmailAvailable(db, email, id);
  const status = input.status ?? current.status;
  if (isAdmin && actor.id === id && status !== "active") {
    throw badRequest("You cannot deactivate your own account.");
  }

  const [updated] = await db
    .update(users)
    .set({
      fullName,
      email,
      status,
      imageUrl: input.imageUrl === undefined ? current.imageUrl : input.imageUrl || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (status !== current.status) {
    if (status !== "active") await revokeSessions(db, id);
    await audit(db, {
      actorId: actor.id,
      subjectUserId: id,
      action:
        status === "disabled"
          ? "account_disabled"
          : status === "active"
            ? "account_activated"
            : "profile_updated",
      note: `Status changed to ${status}`,
    });
  } else {
    await audit(db, { actorId: actor.id, subjectUserId: id, action: "profile_updated" });
  }
  return toUser(updated);
}
