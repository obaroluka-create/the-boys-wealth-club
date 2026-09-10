/**
 * Investments / portfolio service.
 *
 * GET  /users/:id/portfolio
 * GET  /portfolios
 * GET  /users/:id/performance
 * GET  /users/:id/deposits
 * POST /users/:id/deposits
 * POST /users/:id/dividends
 * PATCH /users/:id/portfolio
 * GET  /book
 * PATCH /book
 */

import { platformDb } from "@/data/mock/db";
import { invalidateQueries } from "@/lib/query";
import { ApiError, callService } from "@/services/client";
import type {
  CollectiveBook,
  Deposit,
  InvestmentPortfolio,
  InvestmentUpdateInput,
  RecordDepositInput,
  RecordDividendInput,
  TimeRange,
  UpdateBookInput,
} from "@/types";

export async function getPortfolio(userId: string): Promise<InvestmentPortfolio> {
  return callService(`/users/${userId}/portfolio`, { method: "GET" }, () => {
    const portfolio = platformDb.getPortfolioByUser(userId);
    if (!portfolio) throw new ApiError("Unable to load portfolio data.", 404);
    return portfolio;
  });
}

export async function listPortfolios(): Promise<InvestmentPortfolio[]> {
  return callService("/portfolios", { method: "GET" }, () => platformDb.listPortfolios());
}

export async function getPerformance(userId: string, range: TimeRange = "ALL") {
  return callService(`/users/${userId}/performance?range=${range}`, { method: "GET" }, () =>
    platformDb.getPerformance(userId, range),
  );
}

export async function listDeposits(userId: string): Promise<Deposit[]> {
  return callService(`/users/${userId}/deposits`, { method: "GET" }, () =>
    platformDb.listDeposits(userId),
  );
}

export async function recordDeposit(userId: string, input: RecordDepositInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ApiError("Enter a deposit greater than zero.");
  }
  const portfolio = await callService(
    `/users/${userId}/deposits`,
    { method: "POST", body: JSON.stringify(input) },
    () => platformDb.recordDeposit(userId, input),
  );
  invalidateQueries();
  return portfolio;
}

export async function recordDividend(userId: string, input: RecordDividendInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ApiError("Enter a dividend greater than zero.");
  }
  const portfolio = await callService(
    `/users/${userId}/dividends`,
    { method: "POST", body: JSON.stringify(input) },
    () => platformDb.recordDividend(userId, input),
  );
  invalidateQueries();
  return portfolio;
}

export async function getBook(): Promise<CollectiveBook> {
  return callService("/book", { method: "GET" }, () => platformDb.getBook());
}

export async function updateBook(input: UpdateBookInput) {
  const book = await callService("/book", { method: "PATCH", body: JSON.stringify(input) }, () =>
    platformDb.updateBook(input),
  );
  invalidateQueries();
  return book;
}

export async function updateInvestment(userId: string, input: InvestmentUpdateInput) {
  const portfolio = await callService(
    `/users/${userId}/portfolio`,
    { method: "PATCH", body: JSON.stringify(input) },
    () => platformDb.updateInvestment(userId, input),
  );
  invalidateQueries();
  return portfolio;
}

export async function updateBalance(userId: string, nextBalance: number) {
  if (nextBalance < 0) throw new ApiError("Balance cannot be negative.");
  const portfolio = await callService(
    `/users/${userId}/portfolio/balance`,
    { method: "PATCH", body: JSON.stringify({ currentBalance: nextBalance }) },
    () => platformDb.updateBalance(userId, nextBalance),
  );
  invalidateQueries();
  return portfolio;
}
