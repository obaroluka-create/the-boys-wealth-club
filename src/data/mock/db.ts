import { DEMO_PASSWORD, PLATFORM_STORAGE_KEY } from "@/lib/constants";
import { createUuidV4 } from "@/lib/uuid";
import { createSeedState, type PlatformState } from "@/data/mock/seed";
import type {
  AccountStatus,
  BookValuation,
  CollectiveBook,
  CreateUserInput,
  Deposit,
  Dividend,
  InvestmentPortfolio,
  LeaderboardEntry,
  Paginated,
  PlatformAnalytics,
  RecordDepositInput,
  RecordDividendInput,
  TimeRange,
  Transaction,
  UpdateBookInput,
  UpdateUserInput,
  User,
  UserQuery,
} from "@/types";
import {
  netProfitLoss,
  portfolioPerformancePercentage,
  roundCurrency,
} from "@/utils/investmentCalculations";
import {
  applyPeriodReturn,
  percentChange,
  replayPortfolio,
  unitsForAmount,
} from "@/utils/unitAccounting";

type Listener = () => void;

let state: PlatformState = createSeedState();
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  persist();
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(state));
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const raw = localStorage.getItem(PLATFORM_STORAGE_KEY);
  if (!raw) {
    persist();
    return;
  }
  try {
    const parsed = JSON.parse(raw) as PlatformState;
    if (parsed?.users?.length && parsed?.portfolios?.length && parsed.book && parsed.deposits && parsed.valuations) {
      state = { ...createSeedState(), ...parsed, sessions: parsed.sessions ?? {} };
    } else {
      state = createSeedState();
      persist();
    }
  } catch {
    state = createSeedState();
    persist();
  }
}

function snapshot(): PlatformState {
  hydrate();
  return state;
}

function nowIso() {
  return new Date().toISOString();
}

function today() {
  return nowIso().slice(0, 10);
}

function nextReference() {
  const numbers = snapshot().portfolios.map((item) => {
    const match = item.reference.match(/(\d+)$/);
    return match ? Number(match[1]) : 1000;
  });
  const next = Math.max(1400, ...numbers) + 1;
  return `MER-${next}`;
}

function assertEmailAvailable(email: string, exceptUserId?: string) {
  const taken = snapshot().users.some(
    (item) => item.id !== exceptUserId && item.email.toLowerCase() === email,
  );
  if (taken) throw new Error("Another account already uses this email.");
}

function uniqueUsername(email: string) {
  const base = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "investor";
  const taken = new Set(snapshot().users.map((item) => item.username.toLowerCase()));
  let candidate = base;
  for (let suffix = 2; taken.has(candidate); suffix += 1) candidate = `${base}${suffix}`;
  return candidate;
}

/** Month keys (YYYY-MM) every `step` months, ending with the current month. */
function recentMonths(count: number, step: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index) * step, 1),
    );
    return date.toISOString().slice(0, 7);
  });
}

function appendTransaction(entry: Omit<Transaction, "id" | "status" | "date"> & { date?: string }) {
  state.transactions = [
    {
      id: createUuidV4(),
      status: "completed",
      date: entry.date ?? nowIso(),
      ...entry,
    },
    ...state.transactions,
  ];
}

function depositsFor(portfolioId: string) {
  return state.deposits.filter((item) => item.portfolioId === portfolioId);
}

/** Recompute a portfolio's figures from its deposits and the book's price history. */
function revalue(portfolio: InvestmentPortfolio): InvestmentPortfolio {
  const position = replayPortfolio(depositsFor(portfolio.id), state.valuations);
  return {
    ...portfolio,
    units: position.units,
    totalDeposit: position.totalDeposit,
    currentBalance: position.currentBalance,
    totalProfit: position.totalProfit,
    totalLoss: position.totalLoss,
    updatedAt: nowIso(),
  };
}

/** Last day (YYYY-MM-DD) of a YYYY-MM month. */
function monthEnd(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10);
}

export const platformDb = {
  subscribe(listener: Listener) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return snapshot();
  },
  getServerSnapshot() {
    return state;
  },
  reset() {
    state = createSeedState();
    emit();
  },

  listUsers() {
    return snapshot().users;
  },
  getUser(id: string) {
    return snapshot().users.find((item) => item.id === id) ?? null;
  },
  findUserByIdentifier(identifier: string) {
    const value = identifier.trim().toLowerCase();
    return (
      snapshot().users.find(
        (item) => item.email.toLowerCase() === value || item.username.toLowerCase() === value,
      ) ?? null
    );
  },
  verifyCredentials(identifier: string, password: string) {
    const user = this.findUserByIdentifier(identifier);
    if (!user) return null;
    const stored =
      snapshot().credentials[user.email.toLowerCase()] ??
      snapshot().credentials[user.username.toLowerCase()];
    if (stored !== password) return null;
    return user;
  },
  queryUsers(query: UserQuery = {}): Paginated<User> {
    const {
      search = "",
      status = "all",
      sortBy = "name",
      sortDir = "asc",
      page = 1,
      pageSize = 8,
    } = query;

    let items = snapshot().users.filter((item) => item.role === "user");
    if (status !== "all") items = items.filter((item) => item.status === status);

    const term = search.trim().toLowerCase();
    if (term) {
      items = items.filter((item) => {
        const portfolio = this.getPortfolioByUser(item.id);
        return (
          item.fullName.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          item.username.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term) ||
          portfolio?.reference.toLowerCase().includes(term)
        );
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    items = [...items].sort((a, b) => {
      const portfolioA = this.getPortfolioByUser(a.id);
      const portfolioB = this.getPortfolioByUser(b.id);
      if (sortBy === "investment") {
        return ((portfolioA?.totalDeposit ?? 0) - (portfolioB?.totalDeposit ?? 0)) * dir;
      }
      if (sortBy === "balance") {
        return ((portfolioA?.currentBalance ?? 0) - (portfolioB?.currentBalance ?? 0)) * dir;
      }
      return a.fullName.localeCompare(b.fullName) * dir;
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    };
  },
  createUser(input: CreateUserInput): User {
    const id = input.id ?? createUuidV4();
    const email = input.email.trim().toLowerCase();
    assertEmailAvailable(email);
    const username = uniqueUsername(email);
    const created: User = {
      id,
      fullName: input.fullName.trim(),
      email,
      username,
      role: "user",
      status: input.status,
      memberSince: today(),
      imageUrl: `https://i.pravatar.cc/256?u=${id}`,
    };
    const opening = roundCurrency(input.totalDeposit);
    const unitPrice = state.book.unitPrice;
    const portfolioId = createUuidV4();
    // The opening deposit buys units at today's price, so a new investor starts at 0% return.
    const openingDeposit: Deposit = {
      id: createUuidV4(),
      userId: id,
      portfolioId,
      amount: opening,
      units: unitsForAmount(opening, unitPrice),
      unitPrice,
      date: nowIso(),
      note: "Opening deposit",
    };
    state.deposits = [openingDeposit, ...state.deposits];
    const createdPortfolio = revalue({
      id: portfolioId,
      userId: id,
      reference: nextReference(),
      units: 0,
      totalDeposit: 0,
      currentBalance: 0,
      totalProfit: 0,
      totalLoss: 0,
      totalDividends: 0,
      updatedAt: nowIso(),
    });

    state.users = [created, ...state.users];
    state.portfolios = [createdPortfolio, ...state.portfolios];
    state.credentials[created.email] = DEMO_PASSWORD;
    state.credentials[created.username] = DEMO_PASSWORD;
    appendTransaction({
      userId: id,
      action: "account_created",
      previousValue: null,
      newValue: opening,
      note: `Opening deposit · ${openingDeposit.units.toFixed(4)} units at ${unitPrice.toFixed(2)}`,
    });
    emit();
    return created;
  },
  updateUser(id: string, input: UpdateUserInput): User {
    const current = this.getUser(id);
    if (!current) throw new Error("User not found.");
    const fullName = input.fullName?.trim() ?? current.fullName;
    const email = input.email?.trim().toLowerCase() ?? current.email;
    if (!fullName) throw new Error("Full name is required.");
    if (!email) throw new Error("Email is required.");
    if (email !== current.email) {
      assertEmailAvailable(email, id);
      // Credentials are keyed by email, so carry the password over to the new address.
      const previousEmail = current.email.toLowerCase();
      const password = state.credentials[previousEmail];
      delete state.credentials[previousEmail];
      if (password !== undefined) state.credentials[email] = password;
    }
    const next: User = {
      ...current,
      fullName,
      email,
      status: input.status ?? current.status,
      imageUrl: input.imageUrl ?? current.imageUrl,
    };
    state.users = state.users.map((item) => (item.id === id ? next : item));
    if (input.status && input.status !== current.status) {
      appendTransaction({
        userId: id,
        action: input.status === "disabled" ? "account_disabled" : "account_activated",
        previousValue: null,
        newValue: null,
        note: `Status changed to ${input.status}`,
      });
    } else {
      appendTransaction({
        userId: id,
        action: "profile_updated",
        previousValue: null,
        newValue: null,
      });
    }
    emit();
    return next;
  },
  setUserStatus(id: string, status: AccountStatus) {
    return this.updateUser(id, { status });
  },

  getPortfolioByUser(userId: string) {
    return snapshot().portfolios.find((item) => item.userId === userId) ?? null;
  },
  listPortfolios() {
    return snapshot().portfolios;
  },
  getBook(): CollectiveBook {
    return snapshot().book;
  },
  listDeposits(userId?: string) {
    const items = snapshot().deposits;
    const filtered = userId ? items.filter((item) => item.userId === userId) : items;
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  },
  recordDeposit(userId: string, input: RecordDepositInput): InvestmentPortfolio {
    const current = this.getPortfolioByUser(userId);
    const owner = this.getUser(userId);
    if (!current || !owner) throw new Error("Portfolio not found.");
    const amount = roundCurrency(input.amount);
    if (amount <= 0) throw new Error("Deposit must be greater than zero.");

    // A deposit buys units at the current price; it does not earn past performance.
    const unitPrice = state.book.unitPrice;
    const deposit: Deposit = {
      id: createUuidV4(),
      userId,
      portfolioId: current.id,
      amount,
      units: unitsForAmount(amount, unitPrice),
      unitPrice,
      date: nowIso(),
      note: input.note?.trim() || "Additional deposit",
    };
    state.deposits = [deposit, ...state.deposits];
    const next = revalue(current);
    state.portfolios = state.portfolios.map((item) => (item.id === next.id ? next : item));
    appendTransaction({
      userId,
      action: "deposit_recorded",
      previousValue: current.totalDeposit,
      newValue: next.totalDeposit,
      note: `${deposit.note} · ${deposit.units.toFixed(4)} units at ${unitPrice.toFixed(2)}`,
    });
    emit();
    return next;
  },
  recordDividend(userId: string, input: RecordDividendInput): InvestmentPortfolio {
    const current = this.getPortfolioByUser(userId);
    const owner = this.getUser(userId);
    if (!current || !owner) throw new Error("Portfolio not found.");
    const amount = roundCurrency(input.amount);
    if (!(amount > 0)) throw new Error("Dividend must be greater than zero.");

    // Dividends are tracked separately and never change the current balance.
    const next: InvestmentPortfolio = {
      ...current,
      totalDividends: roundCurrency(current.totalDividends + amount),
      updatedAt: nowIso(),
    };
    const dividend: Dividend = {
      id: createUuidV4(),
      userId,
      portfolioId: next.id,
      portfolioReference: next.reference,
      date: today(),
      type: input.type ?? "special",
      amount,
      status: "paid",
    };
    state.dividends = [dividend, ...state.dividends];
    state.portfolios = state.portfolios.map((item) => (item.id === next.id ? next : item));
    appendTransaction({
      userId,
      action: "dividend_added",
      previousValue: current.totalDividends,
      newValue: next.totalDividends,
    });
    emit();
    return next;
  },
  listBookValuations(): BookValuation[] {
    return [...snapshot().valuations].reverse();
  },
  updateBook(input: UpdateBookInput): CollectiveBook {
    const { profitPercent, lossPercent } = input;
    if (!Number.isFinite(profitPercent) || !Number.isFinite(lossPercent)) {
      throw new Error("Enter valid book percentages.");
    }
    if (profitPercent < 0 || lossPercent < 0) {
      throw new Error("Profit and loss percentages cannot be negative.");
    }
    if (profitPercent === 0 && lossPercent === 0) {
      throw new Error("Enter a profit or loss percentage for the book.");
    }
    if (lossPercent - profitPercent >= 100) {
      throw new Error("A period loss of 100% or more would wipe out the book.");
    }

    // Performance moves the unit price only; every investor's units stay the same.
    const previousUnitPrice = snapshot().book.unitPrice;
    const unitPrice = applyPeriodReturn(previousUnitPrice, profitPercent, lossPercent);
    const date = nowIso();
    const valuation: BookValuation = {
      id: createUuidV4(),
      date,
      unitPrice,
      previousUnitPrice,
      changePercent: percentChange(previousUnitPrice, unitPrice),
      profitPercent,
      lossPercent,
    };
    state.valuations = [...state.valuations, valuation];
    state.book = {
      ...state.book,
      unitPrice,
      updatedAt: date,
      lastChangePercent: valuation.changePercent,
    };

    const previousById = new Map(state.portfolios.map((item) => [item.id, item]));
    state.portfolios = state.portfolios.map((portfolio) => revalue(portfolio));
    const priceNote = `Unit price ${previousUnitPrice.toFixed(2)} → ${unitPrice.toFixed(2)}`;
    state.portfolios.forEach((portfolio) => {
      const owner = this.getUser(portfolio.userId);
      if (owner?.role !== "user" || portfolio.units <= 0) return;
      appendTransaction({
        userId: portfolio.userId,
        action: "book_updated",
        previousValue: previousById.get(portfolio.id)?.currentBalance ?? null,
        newValue: portfolio.currentBalance,
        note: priceNote,
      });
    });
    emit();
    return state.book;
  },
  createSession(userId: string) {
    snapshot();
    const token = createUuidV4();
    state.sessions[token] = { userId, createdAt: nowIso() };
    persist();
    return token;
  },
  resolveSession(token: string) {
    const entry = snapshot().sessions[token];
    if (!entry) return null;
    return this.getUser(entry.userId);
  },
  revokeSession(token: string) {
    delete state.sessions[token];
    persist();
  },
  requestPasswordReset(identifier: string) {
    const user = this.findUserByIdentifier(identifier);
    if (user) {
      appendTransaction({
        userId: user.id,
        action: "password_reset_requested",
        previousValue: null,
        newValue: null,
        note: "Password reset requested. Operations will issue new credentials.",
      });
      emit();
    }
    return { received: true as const };
  },

  listDividends(userId?: string) {
    const items = snapshot().dividends;
    return userId ? items.filter((item) => item.userId === userId) : items;
  },
  listTransactions(userId?: string) {
    const items = snapshot().transactions;
    return userId ? items.filter((item) => item.userId === userId) : items;
  },
  getPerformance(userId: string, range: TimeRange = "ALL") {
    const portfolio = this.getPortfolioByUser(userId);
    if (!portfolio) return [];
    const series = replayPortfolio(depositsFor(portfolio.id), snapshot().valuations);
    if (range === "ALL") return series.points;
    const days = range === "1M" ? 30 : range === "3M" ? 90 : range === "6M" ? 180 : 365;
    // Measure the window back from the latest recorded point, not the wall clock,
    // so short ranges still show data when the history was last updated a while ago.
    const latest = series.points.at(-1)?.date ?? today();
    const cutoff = new Date(`${latest}T00:00:00.000Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const filtered = series.points.filter((point) => point.date >= cutoffIso);
    return filtered.length > 1 ? filtered : series.points.slice(-2);
  },
  getLeaderboard(): LeaderboardEntry[] {
    return snapshot()
      .users.filter((item) => item.role === "user" && item.status === "active")
      .map((item) => {
        const portfolio = this.getPortfolioByUser(item.id);
        return { userId: item.id, currentBalance: portfolio?.currentBalance ?? 0, rank: 0 };
      })
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  },
  getAnalytics(): PlatformAnalytics {
    const investors = snapshot().users.filter((item) => item.role === "user");
    const activePortfolios = snapshot().portfolios.filter((item) => {
      const owner = this.getUser(item.userId);
      return owner?.role === "user";
    });
    const totalInvestmentCapital = activePortfolios.reduce((sum, item) => sum + item.totalDeposit, 0);
    const totalPortfolioValue = activePortfolios.reduce((sum, item) => sum + item.currentBalance, 0);
    const totalPlatformProfitLoss = activePortfolios.reduce(
      (sum, item) => sum + netProfitLoss(item.totalProfit, item.totalLoss),
      0,
    );
    const totalDividendsDistributed = activePortfolios.reduce((sum, item) => sum + item.totalDividends, 0);
    const performances = activePortfolios.map((item) => ({
      userId: item.userId,
      value: portfolioPerformancePercentage(item),
    }));
    const ranked = [...performances].sort((a, b) => b.value - a.value);
    const months = recentMonths(7, 3);
    const userGrowth = months.map((month) => ({
      month,
      users: investors.filter((item) => item.memberSince.slice(0, 7) <= month).length,
    }));
    const seriesByPortfolio = activePortfolios.map(
      (item) => replayPortfolio(depositsFor(item.id), snapshot().valuations).points,
    );
    // Total book value at each month end: the last point on or before that day per portfolio.
    const investmentGrowth = months.map((month) => {
      const end = monthEnd(month);
      const value = seriesByPortfolio.reduce((sum, points) => {
        const point = points.filter((entry) => entry.date <= end).at(-1);
        return sum + (point?.value ?? 0);
      }, 0);
      return { month, value: Math.round(value) };
    });

    return {
      totalUsers: investors.length,
      totalInvestmentCapital,
      totalPortfolioValue,
      totalPlatformProfitLoss,
      totalDividendsDistributed,
      averageUserPerformance:
        performances.length === 0
          ? 0
          : performances.reduce((sum, item) => sum + item.value, 0) / performances.length,
      bestPerformingUserId: ranked[0]?.userId ?? null,
      worstPerformingUserId: ranked.at(-1)?.userId ?? null,
      userGrowth,
      investmentGrowth,
    };
  },
};
