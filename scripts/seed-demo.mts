/**
 * Load the demo data (the same investors, deposits, dividends and price history
 * as the mock platform) into an empty database, for local development only.
 *   npm run db:seed-demo
 * Every demo account uses the demo password and does not need to change it.
 */
import { closeDatabase, openDatabase } from "@/server/db/client";
import {
  auditLog,
  bookValuations,
  deposits,
  dividends,
  portfolios,
  users,
} from "@/server/db/schema";
import { hashPassword } from "@/server/domain/auth";
import { nairaToKobo, percentToScaled, unitsForAmount } from "@/server/money";
import { DEMO_PASSWORD } from "@/lib/constants";
import * as demo from "@/data/mock/seed";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to load demo data in production.");
  process.exit(1);
}

const priceScaled = (naira: number) => BigInt(Math.round(naira * 10_000));

const db = await openDatabase();
try {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    console.error("The database already has users. Demo data only loads into an empty database.");
    process.exitCode = 1;
  } else {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    await db.transaction(async (tx) => {
      await tx.insert(users).values(
        demo.users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status,
          memberSince: user.memberSince,
          imageUrl: user.imageUrl || null,
          passwordHash,
          mustChangePassword: false,
        })),
      );

      const valuations = demo.bookValuations.map((item) => ({
        recordedAt: new Date(item.date),
        unitPrice: priceScaled(item.unitPrice),
        previousUnitPrice: priceScaled(item.previousUnitPrice),
        profitPercent: percentToScaled(item.profitPercent),
        lossPercent: percentToScaled(item.lossPercent),
      }));
      await tx.insert(bookValuations).values(valuations);

      await tx.insert(portfolios).values(
        demo.portfolios.map((item) => ({ id: item.id, userId: item.userId, reference: item.reference })),
      );

      // Recompute each deposit's units exactly, at the price in effect when it was made.
      await tx.insert(deposits).values(
        demo.deposits.map((item) => {
          const at = new Date(item.date);
          const price =
            valuations.filter((valuation) => valuation.recordedAt <= at).at(-1)?.unitPrice ??
            valuations[0].unitPrice;
          const amount = nairaToKobo(item.amount);
          return {
            id: crypto.randomUUID(),
            portfolioId: item.portfolioId,
            amount,
            units: unitsForAmount(amount, price),
            unitPrice: price,
            recordedAt: at,
            note: item.note ?? null,
          };
        }),
      );

      await tx.insert(dividends).values(
        demo.dividends.map((item) => ({
          id: item.id,
          portfolioId: item.portfolioId,
          amount: nairaToKobo(item.amount),
          type: item.type,
          status: item.status,
          paidOn: item.date,
          recordedAt: new Date(`${item.date}T12:00:00.000Z`),
        })),
      );

      await tx.insert(auditLog).values(
        demo.transactions.map((item) => ({
          createdAt: new Date(item.date),
          subjectUserId: item.userId,
          action: item.action,
          previousValue: item.previousValue === null ? null : nairaToKobo(item.previousValue),
          newValue: item.newValue === null ? null : nairaToKobo(item.newValue),
          note: item.note ?? null,
        })),
      );
    });
    console.log(
      `Loaded ${demo.users.length} users, ${demo.deposits.length} deposits and ${demo.bookValuations.length} valuations.`,
    );
    console.log(`Every demo account uses the password ${DEMO_PASSWORD}`);
  }
} finally {
  await closeDatabase(db);
}
