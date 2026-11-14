/**
 * Database rows → the JSON shapes in `src/types` that the frontend services expect.
 * All BigInt money values are converted to naira numbers here and nowhere else.
 */

import type { auditLog, bookValuations, deposits, dividends, users } from "@/server/db/schema";
import {
  koboToNaira,
  percentChange,
  percentToNumber,
  priceToNaira,
  unitsToNumber,
  type Position,
} from "@/server/money";
import type {
  BookValuation,
  Deposit,
  Dividend,
  InvestmentPortfolio,
  PortfolioPerformancePoint,
  Session,
  Transaction,
  TransactionAction,
  User,
} from "@/types";

type UserRow = typeof users.$inferSelect;
type DepositRow = typeof deposits.$inferSelect;
type DividendRow = typeof dividends.$inferSelect;
type ValuationRow = typeof bookValuations.$inferSelect;
type AuditRow = typeof auditLog.$inferSelect;

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    username: row.username,
    role: row.role,
    status: row.status,
    memberSince: row.memberSince,
    imageUrl: row.imageUrl ?? "",
  };
}

export function toSession(row: UserRow): Session {
  return {
    userId: row.id,
    uuid: row.id,
    role: row.role,
    email: row.email,
    username: row.username,
    fullName: row.fullName,
    status: row.status,
    mustChangePassword: row.mustChangePassword,
  };
}

export function toPortfolio(
  portfolio: { id: string; userId: string; reference: string },
  position: Position,
  totalDividends: bigint,
  updatedAt: Date,
): InvestmentPortfolio {
  return {
    id: portfolio.id,
    userId: portfolio.userId,
    reference: portfolio.reference,
    units: unitsToNumber(position.units),
    totalDeposit: koboToNaira(position.totalDeposit),
    currentBalance: koboToNaira(position.currentBalance),
    totalProfit: koboToNaira(position.totalProfit),
    totalLoss: koboToNaira(position.totalLoss),
    totalDividends: koboToNaira(totalDividends),
    updatedAt: updatedAt.toISOString(),
  };
}

export function toPerformancePoints(position: Position): PortfolioPerformancePoint[] {
  return position.points.map((point) => ({
    date: point.date,
    value: koboToNaira(point.value),
    percentageChange: percentChange(point.deposited, point.value),
  }));
}

export function toDeposit(row: DepositRow, userId: string): Deposit {
  return {
    id: row.id,
    userId,
    portfolioId: row.portfolioId,
    amount: koboToNaira(row.amount),
    units: unitsToNumber(row.units),
    unitPrice: priceToNaira(row.unitPrice),
    date: row.recordedAt.toISOString(),
    note: row.note ?? undefined,
  };
}

export function toDividend(row: DividendRow, userId: string, reference: string): Dividend {
  return {
    id: row.id,
    userId,
    portfolioId: row.portfolioId,
    portfolioReference: reference,
    date: row.paidOn,
    type: row.type,
    amount: koboToNaira(row.amount),
    status: row.status,
  };
}

export function toValuation(row: ValuationRow): BookValuation {
  return {
    id: row.id,
    date: row.recordedAt.toISOString(),
    unitPrice: priceToNaira(row.unitPrice),
    previousUnitPrice: priceToNaira(row.previousUnitPrice),
    changePercent: percentChange(row.previousUnitPrice, row.unitPrice),
    profitPercent: percentToNumber(row.profitPercent),
    lossPercent: percentToNumber(row.lossPercent),
  };
}

export function toTransaction(row: AuditRow): Transaction {
  return {
    id: row.id,
    userId: row.subjectUserId ?? row.actorId ?? "",
    date: row.createdAt.toISOString(),
    action: row.action as TransactionAction,
    previousValue: row.previousValue === null ? null : koboToNaira(row.previousValue),
    newValue: row.newValue === null ? null : koboToNaira(row.newValue),
    status: "completed",
    note: row.note ?? undefined,
  };
}
