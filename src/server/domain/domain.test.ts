import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, openDatabase, type Db } from "@/server/db/client";
import { auditLog, users } from "@/server/db/schema";
import * as auth from "@/server/domain/auth";
import * as ledger from "@/server/domain/ledger";
import * as userDomain from "@/server/domain/users";
import { HttpError } from "@/server/errors";

let db: Db;
let admin: auth.UserRow;

async function makeAdmin() {
  const [row] = await db
    .insert(users)
    .values({
      fullName: "Test Admin",
      email: "admin@example.test",
      username: "admin",
      role: "admin",
      status: "active",
      passwordHash: await auth.hashPassword("AdminPass123"),
      mustChangePassword: false,
    })
    .returning();
  return row;
}

beforeAll(async () => {
  db = await openDatabase("pglite:memory://");
  admin = await makeAdmin();
});

afterAll(async () => {
  await closeDatabase(db);
});

async function expectHttpError(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toBeInstanceOf(HttpError);
  await promise.catch((error: HttpError) => expect(error.status).toBe(status));
}

describe("unit accounting through the ledger", () => {
  it("starts a new investor at exactly their deposit, then shares later performance", async () => {
    const created = await userDomain.createUser(db, admin, {
      fullName: "Ada Investor",
      email: "ada@example.test",
      totalDeposit: 100_000,
      status: "active",
    });
    const opening = await ledger.getPortfolio(db, created.user.id);
    expect(opening.currentBalance).toBe(100_000);
    expect(opening.totalProfit).toBe(0);
    expect(opening.units).toBe(100); // ₦100,000 at the ₦1,000 launch price

    await ledger.updateBook(db, admin, { profitPercent: 10, lossPercent: 0 });
    const afterRise = await ledger.getPortfolio(db, created.user.id);
    expect(afterRise.currentBalance).toBe(110_000);

    // A second investor joining now buys at ₦1,100 and gets none of the earlier 10%.
    const late = await userDomain.createUser(db, admin, {
      fullName: "Bayo Investor",
      email: "bayo@example.test",
      totalDeposit: 110_000,
      status: "active",
    });
    const lateOpening = await ledger.getPortfolio(db, late.user.id);
    expect(lateOpening.currentBalance).toBe(110_000);
    expect(lateOpening.units).toBe(100);

    // A top-up adds exactly its amount, with no instant gain.
    await ledger.recordDeposit(db, admin, created.user.id, { amount: 55_000 });
    const toppedUp = await ledger.getPortfolio(db, created.user.id);
    expect(toppedUp.currentBalance).toBe(165_000);
    expect(toppedUp.totalDeposit).toBe(155_000);

    // A −10% period moves everyone by the same percentage.
    await ledger.updateBook(db, admin, { profitPercent: 0, lossPercent: 10 });
    expect((await ledger.getPortfolio(db, created.user.id)).currentBalance).toBe(148_500);
    expect((await ledger.getPortfolio(db, late.user.id)).currentBalance).toBe(99_000);
  });

  it("keeps dividends out of the balance", async () => {
    const created = await userDomain.createUser(db, admin, {
      fullName: "Chi Dividend",
      email: "chi@example.test",
      totalDeposit: 50_000,
      status: "active",
    });
    const before = await ledger.getPortfolio(db, created.user.id);
    const after = await ledger.recordDividend(db, admin, created.user.id, {
      amount: 2_500,
      type: "quarterly",
    });
    expect(after.currentBalance).toBe(before.currentBalance);
    expect(after.totalDividends).toBe(2_500);
    const [dividend] = await ledger.listDividends(db, created.user.id);
    expect(dividend.type).toBe("quarterly");
  });

  it("rejects invalid book updates", async () => {
    await expectHttpError(ledger.updateBook(db, admin, { profitPercent: 0, lossPercent: 0 }), 400);
    await expectHttpError(ledger.updateBook(db, admin, { profitPercent: 0, lossPercent: 100 }), 400);
  });

  it("ranks the leaderboard by balance without exposing names", async () => {
    const board = await ledger.getLeaderboard(db);
    expect(board.length).toBeGreaterThan(0);
    expect(Object.keys(board[0]).sort()).toEqual(["currentBalance", "rank", "userId"]);
    for (let i = 1; i < board.length; i += 1) {
      expect(board[i - 1].currentBalance).toBeGreaterThanOrEqual(board[i].currentBalance);
    }
  });
});

describe("authentication", () => {
  it("issues a one-time password that must be changed", async () => {
    const created = await userDomain.createUser(db, admin, {
      fullName: "Dele Login",
      email: "dele@example.test",
      totalDeposit: 10_000,
      status: "active",
    });
    const result = await auth.login(db, {
      identifier: "DELE@example.test",
      password: created.temporaryPassword,
    });
    expect(result.user.mustChangePassword).toBe(true);

    const session = await auth.resolveSession(db, result.token);
    expect(session?.user.id).toBe(created.user.id);

    await auth.changePassword(db, session!.user, session!.sessionId, {
      currentPassword: created.temporaryPassword,
      newPassword: "MyOwnPass2026",
    });
    const relogin = await auth.login(db, { identifier: "dele", password: "MyOwnPass2026" });
    expect(relogin.user.mustChangePassword).toBe(false);
  });

  it("rejects weak passwords", async () => {
    const result = await auth.login(db, { identifier: "dele", password: "MyOwnPass2026" });
    const session = await auth.resolveSession(db, result.token);
    await expectHttpError(
      auth.changePassword(db, session!.user, session!.sessionId, {
        currentPassword: "MyOwnPass2026",
        newPassword: "short",
      }),
      400,
    );
  });

  it("locks an account after repeated failures", async () => {
    for (let i = 0; i < auth.MAX_FAILED_LOGINS; i += 1) {
      await expectHttpError(auth.login(db, { identifier: "dele", password: "wrong-password" }), 401);
    }
    // Even the right password is refused while locked.
    await expectHttpError(auth.login(db, { identifier: "dele", password: "MyOwnPass2026" }), 429);
    await db.update(users).set({ lockedUntil: null }).where(eq(users.email, "dele@example.test"));
  });

  it("gives the same answer for unknown accounts and wrong passwords", async () => {
    await expectHttpError(auth.login(db, { identifier: "nobody@example.test", password: "x" }), 401);
  });

  it("signs out a disabled user and blocks their sign-in", async () => {
    const result = await auth.login(db, { identifier: "dele", password: "MyOwnPass2026" });
    const [dele] = await db.select().from(users).where(eq(users.email, "dele@example.test"));
    await userDomain.updateUser(db, admin, dele.id, { status: "disabled" });
    expect(await auth.resolveSession(db, result.token)).toBeNull();
    await expectHttpError(auth.login(db, { identifier: "dele", password: "MyOwnPass2026" }), 403);
  });

  it("revokes sessions when an admin issues a temporary password", async () => {
    const created = await userDomain.createUser(db, admin, {
      fullName: "Efe Reset",
      email: "efe@example.test",
      totalDeposit: 10_000,
      status: "active",
    });
    const result = await auth.login(db, { identifier: "efe", password: created.temporaryPassword });
    const { temporaryPassword } = await auth.issueTemporaryPassword(db, admin, created.user.id);
    expect(await auth.resolveSession(db, result.token)).toBeNull();
    await expectHttpError(auth.login(db, { identifier: "efe", password: created.temporaryPassword }), 401);
    await auth.login(db, { identifier: "efe", password: temporaryPassword });
  });
});

describe("permissions in the user domain", () => {
  it("lets investors change only their own photo", async () => {
    const created = await userDomain.createUser(db, admin, {
      fullName: "Femi Self",
      email: "femi@example.test",
      totalDeposit: 10_000,
      status: "active",
    });
    const [femi] = await db.select().from(users).where(eq(users.id, created.user.id));
    await userDomain.updateUser(db, femi, femi.id, { imageUrl: "data:image/png;base64,AAAA" });
    await expectHttpError(userDomain.updateUser(db, femi, femi.id, { fullName: "Changed" }), 403);
    await expectHttpError(userDomain.updateUser(db, femi, admin.id, { imageUrl: "" }), 403);
  });

  it("rejects duplicate emails", async () => {
    await expectHttpError(
      userDomain.createUser(db, admin, {
        fullName: "Copy",
        email: "ADA@example.test",
        totalDeposit: 1_000,
        status: "active",
      }),
      409,
    );
  });

  it("audits ledger and account changes", async () => {
    const actions = new Set((await db.select().from(auditLog)).map((row) => row.action));
    for (const action of ["account_created", "deposit_recorded", "book_updated", "dividend_added"]) {
      expect(actions.has(action)).toBe(true);
    }
  });
});
