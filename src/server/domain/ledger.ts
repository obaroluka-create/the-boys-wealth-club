import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import {
  auditLog,
  bookValuations,
  deposits,
  dividends,
  portfolios,
  users,
} from "@/server/db/schema";
import { audit } from "@/server/domain/audit";
import type { UserRow } from "@/server/domain/auth";
import { badRequest, notFound } from "@/server/errors";
import { formatCurrency, formatUnits } from "@/lib/format";
import {
  LAUNCH_UNIT_PRICE,
  PERCENT_SCALE,
  applyPeriodReturn,
  koboToNaira,
  nairaToKobo,
  percentChange,
  percentToScaled,
  priceToNaira,
  replay,
  unitsToNumber,
  unitsForAmount,
  valueOf,
  type LedgerDeposit,
  type LedgerValuation,
  type Position,
} from "@/server/money";
import {
  toDeposit,
  toDividend,
  toPerformancePoints,
  toPortfolio,
  toTransaction,
  toValuation,
} from "@/server/serialize";
import type {
  CollectiveBook,
  DividendType,
  InvestmentPortfolio,
  LeaderboardEntry,
  PlatformAnalytics,
  TimeRange,
} from "@/types";

/** Serialises every write that depends on the current unit price. */
const LEDGER_LOCK_KEY = 4_216_001;

async function lockLedger(db: Db) {
  await db.execute(sql`select pg_advisory_xact_lock(${LEDGER_LOCK_KEY})`);
}

// ---------------------------------------------------------------------------
// Book
// ---------------------------------------------------------------------------

/** All valuations, oldest first. Creates the launch valuation the first time. */
async function loadValuations(db: Db) {
  const rows = await db.select().from(bookValuations).orderBy(asc(bookValuations.recordedAt));
  if (rows.length > 0) return rows;
  const [launch] = await db
    .insert(bookValuations)
    .values({ unitPrice: LAUNCH_UNIT_PRICE, previousUnitPrice: LAUNCH_UNIT_PRICE })
    .returning();
  return [launch];
}

function ledgerValuations(rows: (typeof bookValuations.$inferSelect)[]): LedgerValuation[] {
  return rows.map((row) => ({ at: row.recordedAt, unitPrice: row.unitPrice }));
}

export async function getBook(db: Db): Promise<CollectiveBook> {
  const rows = await loadValuations(db);
  const first = rows[0];
  const latest = rows[rows.length - 1];
  return {
    unitPrice: priceToNaira(latest.unitPrice),
    launchUnitPrice: priceToNaira(first.unitPrice),
    launchedAt: first.recordedAt.toISOString(),
    updatedAt: latest.recordedAt.toISOString(),
    lastChangePercent: rows.length > 1 ? percentChange(latest.previousUnitPrice, latest.unitPrice) : 0,
  };
}

export async function listValuations(db: Db) {
  const rows = await loadValuations(db);
  return rows.reverse().map(toValuation);
}

/** Record a period's performance: moves the unit price for every investor. */
export async function updateBook(
  db: Db,
  actor: UserRow,
  input: { profitPercent: number; lossPercent: number },
): Promise<CollectiveBook> {
  const profit = percentToScaled(input.profitPercent);
  const loss = percentToScaled(input.lossPercent);
  if (profit < 0n || loss < 0n) throw badRequest("Profit and loss percentages cannot be negative.");
  if (profit === 0n && loss === 0n) throw badRequest("Enter a profit or loss percentage for the book.");
  if (loss - profit >= 100n * PERCENT_SCALE) {
    throw badRequest("A period loss of 100% or more would wipe out the book.");
  }

  await db.transaction(async (tx) => {
    await lockLedger(tx);
    const valuations = await loadValuations(tx);
    const previous = valuations[valuations.length - 1].unitPrice;
    const next = applyPeriodReturn(previous, profit, loss);
    if (next <= 0n) throw badRequest("That period return would take the unit price to zero.");

    await tx.insert(bookValuations).values({
      unitPrice: next,
      previousUnitPrice: previous,
      profitPercent: profit,
      lossPercent: loss,
      recordedBy: actor.id,
    });

    // Units are unchanged, so each holder's balance moves from units × previous to units × next.
    const holdings = await tx
      .select({
        userId: portfolios.userId,
        units: sql<string>`coalesce(sum(${deposits.units}), 0)`,
      })
      .from(portfolios)
      .innerJoin(deposits, eq(deposits.portfolioId, portfolios.id))
      .groupBy(portfolios.userId);
    const note = `Unit price ${formatCurrency(priceToNaira(previous), true)} → ${formatCurrency(priceToNaira(next), true)}`;
    await audit(
      tx,
      ...holdings
        .map((row) => ({ userId: row.userId, units: BigInt(row.units) }))
        .filter((row) => row.units > 0n)
        .map((row) => ({
          actorId: actor.id,
          subjectUserId: row.userId,
          action: "book_updated" as const,
          previousValue: valueOf(row.units, previous),
          newValue: valueOf(row.units, next),
          note,
        })),
    );
  });

  return getBook(db);
}

// ---------------------------------------------------------------------------
// Portfolios and positions
// ---------------------------------------------------------------------------

async function portfolioForUser(db: Db, userId: string) {
  const [row] = await db.select().from(portfolios).where(eq(portfolios.userId, userId)).limit(1);
  if (!row) throw notFound("Unable to load portfolio data.");
  return row;
}

function ledgerDeposits(rows: (typeof deposits.$inferSelect)[]): LedgerDeposit[] {
  return rows.map((row) => ({
    at: row.recordedAt,
    amount: row.amount,
    units: row.units,
    unitPrice: row.unitPrice,
  }));
}

interface PortfolioSnapshot {
  portfolio: typeof portfolios.$inferSelect;
  position: Position;
  totalDividends: bigint;
  updatedAt: Date;
}

/** Positions for the given portfolios (or all), computed from one read of the ledger. */
async function loadSnapshots(db: Db, portfolioIds?: string[]): Promise<PortfolioSnapshot[]> {
  const portfolioRows = await db
    .select()
    .from(portfolios)
    .where(portfolioIds ? inArray(portfolios.id, portfolioIds) : undefined);
  if (portfolioRows.length === 0) return [];
  const ids = portfolioRows.map((row) => row.id);
  const [valuationRows, depositRows, dividendRows] = await Promise.all([
    loadValuations(db),
    db.select().from(deposits).where(inArray(deposits.portfolioId, ids)),
    db
      .select({ portfolioId: dividends.portfolioId, amount: dividends.amount })
      .from(dividends)
      .where(inArray(dividends.portfolioId, ids)),
  ]);
  const valuations = ledgerValuations(valuationRows);
  const latestValuation = valuationRows[valuationRows.length - 1].recordedAt;

  return portfolioRows.map((portfolio) => {
    const own = depositRows.filter((row) => row.portfolioId === portfolio.id);
    const lastDeposit = own.reduce<Date | null>(
      (latest, row) => (!latest || row.recordedAt > latest ? row.recordedAt : latest),
      null,
    );
    return {
      portfolio,
      position: replay(ledgerDeposits(own), valuations),
      totalDividends: dividendRows
        .filter((row) => row.portfolioId === portfolio.id)
        .reduce((sum, row) => sum + row.amount, 0n),
      updatedAt: lastDeposit && lastDeposit > latestValuation ? lastDeposit : latestValuation,
    };
  });
}

function snapshotToPortfolio(snapshot: PortfolioSnapshot): InvestmentPortfolio {
  return toPortfolio(
    snapshot.portfolio,
    snapshot.position,
    snapshot.totalDividends,
    snapshot.updatedAt,
  );
}

export async function getPortfolio(db: Db, userId: string): Promise<InvestmentPortfolio> {
  const portfolio = await portfolioForUser(db, userId);
  const [snapshot] = await loadSnapshots(db, [portfolio.id]);
  return snapshotToPortfolio(snapshot);
}

export async function listPortfolios(db: Db): Promise<InvestmentPortfolio[]> {
  return (await loadSnapshots(db)).map(snapshotToPortfolio);
}

/** Portfolio figures keyed by user id, for user lists and rankings. */
export async function portfoliosByUser(db: Db) {
  const snapshots = await loadSnapshots(db);
  return new Map(snapshots.map((item) => [item.portfolio.userId, snapshotToPortfolio(item)]));
}

const RANGE_DAYS: Record<Exclude<TimeRange, "ALL">, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

export async function getPerformance(db: Db, userId: string, range: TimeRange) {
  const portfolio = await portfolioForUser(db, userId);
  const [snapshot] = await loadSnapshots(db, [portfolio.id]);
  const points = toPerformancePoints(snapshot.position);
  if (range === "ALL") return points;
  const latest = points.at(-1)?.date ?? new Date().toISOString().slice(0, 10);
  const cutoff = new Date(`${latest}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - RANGE_DAYS[range]);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const filtered = points.filter((point) => point.date >= cutoffIso);
  return filtered.length > 1 ? filtered : points.slice(-2);
}

/** Create a portfolio with its opening deposit. Call inside a transaction. */
export async function openPortfolio(
  tx: Db,
  actor: UserRow,
  userId: string,
  openingDeposit: number,
) {
  await lockLedger(tx); // also serialises reference numbers
  const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(portfolios);
  const reference = `TBWC-${String(1001 + Number(count)).padStart(4, "0")}`;
  const [portfolio] = await tx.insert(portfolios).values({ userId, reference }).returning();
  await addDeposit(tx, actor, portfolio, openingDeposit, "Opening deposit", "account_created");
  return portfolio;
}

async function addDeposit(
  tx: Db,
  actor: UserRow,
  portfolio: typeof portfolios.$inferSelect,
  amountNaira: number,
  note: string,
  action: "deposit_recorded" | "account_created",
) {
  const amount = nairaToKobo(amountNaira);
  if (amount <= 0n) throw badRequest("Enter a deposit greater than zero.");
  await lockLedger(tx);
  const valuations = await loadValuations(tx);
  // Units are bought at the current price, so the deposit only shares in future performance.
  const unitPrice = valuations[valuations.length - 1].unitPrice;
  const units = unitsForAmount(amount, unitPrice);
  if (units <= 0n) throw badRequest("That deposit is too small to buy any units.");

  const [{ total }] = await tx
    .select({ total: sql<string>`coalesce(sum(${deposits.amount}), 0)` })
    .from(deposits)
    .where(eq(deposits.portfolioId, portfolio.id));
  const previousTotal = BigInt(total);

  await tx.insert(deposits).values({
    portfolioId: portfolio.id,
    amount,
    units,
    unitPrice,
    note,
    recordedBy: actor.id,
  });
  await audit(tx, {
    actorId: actor.id,
    subjectUserId: portfolio.userId,
    action,
    previousValue: action === "account_created" ? null : previousTotal,
    newValue: previousTotal + amount,
    note: `${note} · ${formatUnits(unitsToNumber(units))} units at ${formatCurrency(priceToNaira(unitPrice), true)}`,
  });
}

export async function recordDeposit(
  db: Db,
  actor: UserRow,
  userId: string,
  input: { amount: number; note?: string },
) {
  const portfolio = await portfolioForUser(db, userId);
  await db.transaction((tx) =>
    addDeposit(tx, actor, portfolio, input.amount, input.note?.trim() || "Additional deposit", "deposit_recorded"),
  );
  return getPortfolio(db, userId);
}

export async function listDeposits(db: Db, userId: string) {
  const portfolio = await portfolioForUser(db, userId);
  const rows = await db
    .select()
    .from(deposits)
    .where(eq(deposits.portfolioId, portfolio.id))
    .orderBy(desc(deposits.recordedAt));
  return rows.map((row) => toDeposit(row, userId));
}

// ---------------------------------------------------------------------------
// Dividends
// ---------------------------------------------------------------------------

export async function recordDividend(
  db: Db,
  actor: UserRow,
  userId: string,
  input: { amount: number; type?: DividendType },
) {
  const portfolio = await portfolioForUser(db, userId);
  const amount = nairaToKobo(input.amount);
  if (amount <= 0n) throw badRequest("Enter a dividend greater than zero.");

  await db.transaction(async (tx) => {
    const [{ total }] = await tx
      .select({ total: sql<string>`coalesce(sum(${dividends.amount}), 0)` })
      .from(dividends)
      .where(eq(dividends.portfolioId, portfolio.id));
    const previous = BigInt(total);
    // Dividends are paid out separately and never change the unit balance.
    await tx.insert(dividends).values({
      portfolioId: portfolio.id,
      amount,
      type: input.type ?? "special",
      status: "paid",
      recordedBy: actor.id,
    });
    await audit(tx, {
      actorId: actor.id,
      subjectUserId: userId,
      action: "dividend_added",
      previousValue: previous,
      newValue: previous + amount,
    });
  });
  return getPortfolio(db, userId);
}

export async function listDividends(db: Db, userId?: string) {
  const rows = await db
    .select({ dividend: dividends, userId: portfolios.userId, reference: portfolios.reference })
    .from(dividends)
    .innerJoin(portfolios, eq(portfolios.id, dividends.portfolioId))
    .where(userId ? eq(portfolios.userId, userId) : undefined)
    .orderBy(desc(dividends.paidOn), desc(dividends.recordedAt));
  return rows.map((row) => toDividend(row.dividend, row.userId, row.reference));
}

// ---------------------------------------------------------------------------
// Activity, rankings and analytics
// ---------------------------------------------------------------------------

export async function listTransactions(db: Db, userId?: string) {
  const rows = await db
    .select()
    .from(auditLog)
    .where(userId ? eq(auditLog.subjectUserId, userId) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(500);
  return rows.map(toTransaction);
}

/** Active investors ranked by balance, identified by UUID only. */
export async function getLeaderboard(db: Db): Promise<LeaderboardEntry[]> {
  const investors = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "user"), eq(users.status, "active")));
  const byUser = await portfoliosByUser(db);
  return investors
    .map((item) => ({
      userId: item.id,
      currentBalance: byUser.get(item.id)?.currentBalance ?? 0,
      rank: 0,
    }))
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function recentMonths(count: number, step: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index) * step, 1))
      .toISOString()
      .slice(0, 7),
  );
}

function monthEnd(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10);
}

export async function getAnalytics(db: Db): Promise<PlatformAnalytics> {
  const investors = await db.select().from(users).where(eq(users.role, "user"));
  const investorIds = new Set(investors.map((item) => item.id));
  const snapshots = (await loadSnapshots(db)).filter((item) =>
    investorIds.has(item.portfolio.userId),
  );

  const sum = (pick: (item: PortfolioSnapshot) => bigint) =>
    snapshots.reduce((total, item) => total + pick(item), 0n);
  const totalDeposit = sum((item) => item.position.totalDeposit);
  const totalValue = sum((item) => item.position.currentBalance);

  const performances = snapshots.map((item) => ({
    userId: item.portfolio.userId,
    value: percentChange(item.position.totalDeposit, item.position.currentBalance),
  }));
  const ranked = [...performances].sort((a, b) => b.value - a.value);
  const months = recentMonths(7, 3);

  return {
    totalUsers: investors.length,
    totalInvestmentCapital: koboToNaira(totalDeposit),
    totalPortfolioValue: koboToNaira(totalValue),
    totalPlatformProfitLoss: koboToNaira(totalValue - totalDeposit),
    totalDividendsDistributed: koboToNaira(sum((item) => item.totalDividends)),
    averageUserPerformance:
      performances.length === 0
        ? 0
        : performances.reduce((total, item) => total + item.value, 0) / performances.length,
    bestPerformingUserId: ranked[0]?.userId ?? null,
    worstPerformingUserId: ranked.at(-1)?.userId ?? null,
    userGrowth: months.map((month) => ({
      month,
      users: investors.filter((item) => item.memberSince.slice(0, 7) <= month).length,
    })),
    investmentGrowth: months.map((month) => {
      const end = monthEnd(month);
      const value = snapshots.reduce((total, item) => {
        const point = item.position.points.filter((entry) => entry.date <= end).at(-1);
        return total + (point?.value ?? 0n);
      }, 0n);
      return { month, value: Math.round(koboToNaira(value)) };
    }),
  };
}
