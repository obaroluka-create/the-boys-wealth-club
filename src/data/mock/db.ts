import { PLATFORM_STORAGE_KEY } from "@/lib/constants";
import { createUuidV4 } from "@/lib/uuid";
import { createSeedState, type PlatformState } from "@/data/mock/seed";
import { buildPerformanceSeries } from "@/data/mock/seed";
import type {
  AccountStatus,
  CollectiveBook,
  CreateUserInput,
  Deposit,
  Dividend,
  InvestmentPortfolio,
  InvestmentUpdateInput,
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
  applyBookToDeposit,
  derivedBalance,
  netProfitLoss,
  portfolioPerformancePercentage,
  roundCurrency,
} from "@/utils/investmentCalculations";

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
    if (parsed?.users?.length && parsed?.portfolios?.length && parsed.book && parsed.deposits) {
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

function rebuildPerformance(portfolio: InvestmentPortfolio, memberSince: string) {
  state.performances = state.performances.filter((item) => item.portfolioId !== portfolio.id);
  state.performances.push({
    userId: portfolio.userId,
    portfolioId: portfolio.id,
    points: buildPerformanceSeries(
      portfolio.totalDeposit,
      portfolio.currentBalance,
      memberSince,
      today(),
      `collective-book-${state.book.updatedAt}`,
    ),
  });
}

function applyBook(portfolio: InvestmentPortfolio, book: CollectiveBook = state.book): InvestmentPortfolio {
  return {
    ...portfolio,
    ...applyBookToDeposit(portfolio.totalDeposit, book.profitRate, book.lossRate),
    updatedAt: nowIso(),
  };
}

function rebuildAllPerformances() {
  snapshot().portfolios.forEach((portfolio) => {
    const owner = snapshot().users.find((user) => user.id === portfolio.userId);
    if (owner) rebuildPerformance(portfolio, owner.memberSince);
  });
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
    const username = input.email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "investor";
    const created: User = {
      id,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      username,
      role: "user",
      status: input.status,
      memberSince: today(),
      imageUrl: `https://i.pravatar.cc/256?u=${id}`,
    };
    const reference = nextReference();
    const opening = roundCurrency(input.totalDeposit);
    const createdPortfolio = applyBook({
      id: createUuidV4(),
      userId: id,
      reference,
      totalDeposit: opening,
      currentBalance: opening,
      totalProfit: 0,
      totalLoss: 0,
      totalDividends: 0,
      updatedAt: nowIso(),
    });
    const openingDeposit: Deposit = {
      id: createUuidV4(),
      userId: id,
      portfolioId: createdPortfolio.id,
      amount: opening,
      date: today(),
      note: "Opening deposit",
    };

    state.users = [created, ...state.users];
    state.portfolios = [createdPortfolio, ...state.portfolios];
    state.deposits = [openingDeposit, ...state.deposits];
    state.credentials[created.email] = "Meridian2026!";
    state.credentials[created.username] = "Meridian2026!";
    rebuildPerformance(createdPortfolio, created.memberSince);
    appendTransaction({
      userId: id,
      action: "account_created",
      previousValue: null,
      newValue: createdPortfolio.totalDeposit,
    });
    appendTransaction({
      userId: id,
      action: "deposit_recorded",
      previousValue: 0,
      newValue: opening,
      note: "Opening deposit",
    });
    emit();
    return created;
  },
  updateUser(id: string, input: UpdateUserInput): User {
    const current = this.getUser(id);
    if (!current) throw new Error("User not found.");
    const next: User = {
      ...current,
      fullName: input.fullName?.trim() ?? current.fullName,
      email: input.email?.trim().toLowerCase() ?? current.email,
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

    const previousDeposit = current.totalDeposit;
    const next = applyBook({
      ...current,
      totalDeposit: roundCurrency(current.totalDeposit + amount),
    });
    const deposit: Deposit = {
      id: createUuidV4(),
      userId,
      portfolioId: next.id,
      amount,
      date: today(),
      note: input.note?.trim() || "Additional deposit",
    };

    state.portfolios = state.portfolios.map((item) => (item.id === next.id ? next : item));
    state.deposits = [deposit, ...state.deposits];
    rebuildPerformance(next, owner.memberSince);
    appendTransaction({
      userId,
      action: "deposit_recorded",
      previousValue: previousDeposit,
      newValue: next.totalDeposit,
      note: deposit.note,
    });
    emit();
    return next;
  },
  recordDividend(userId: string, input: RecordDividendInput): InvestmentPortfolio {
    return this.updateInvestment(userId, { dividendAmount: input.amount });
  },
  updateBook(input: UpdateBookInput): CollectiveBook {
    const profitDelta = input.incrementalProfitPercent / 100;
    const lossDelta = input.incrementalLossPercent / 100;
    if (!Number.isFinite(profitDelta) || !Number.isFinite(lossDelta)) {
      throw new Error("Enter valid book percentages.");
    }
    if (profitDelta === 0 && lossDelta === 0) {
      throw new Error("Enter a profit or loss percentage for the book.");
    }

    const previousNet = (state.book.profitRate - state.book.lossRate) * 100;
    const book: CollectiveBook = {
      profitRate: state.book.profitRate + profitDelta,
      lossRate: Math.max(0, state.book.lossRate + lossDelta),
      updatedAt: nowIso(),
    };
    const nextNet = (book.profitRate - book.lossRate) * 100;
    state.book = book;
    state.portfolios = state.portfolios.map((portfolio) => {
      const owner = this.getUser(portfolio.userId);
      if (owner?.role !== "user") return portfolio;
      return applyBook(portfolio, book);
    });
    rebuildAllPerformances();
    snapshot()
      .users.filter((user) => user.role === "user")
      .forEach((user) => {
        appendTransaction({
          userId: user.id,
          action: "book_updated",
          previousValue: null,
          newValue: null,
          note: `Collective book updated from ${previousNet.toFixed(2)}% to ${nextNet.toFixed(2)}%`,
        });
      });
    emit();
    return book;
  },
  updateInvestment(userId: string, input: InvestmentUpdateInput): InvestmentPortfolio {
    const current = this.getPortfolioByUser(userId);
    const owner = this.getUser(userId);
    if (!current || !owner) throw new Error("Portfolio not found.");

    let next: InvestmentPortfolio = { ...current, updatedAt: nowIso() };

    if (input.dividendAmount && input.dividendAmount > 0) {
      const previous = next.totalDividends;
      next.totalDividends = roundCurrency(next.totalDividends + input.dividendAmount);
      const dividend: Dividend = {
        id: createUuidV4(),
        userId,
        portfolioId: next.id,
        portfolioReference: next.reference,
        date: today(),
        type: "special",
        amount: roundCurrency(input.dividendAmount),
        status: "paid",
      };
      state.dividends = [dividend, ...state.dividends];
      appendTransaction({
        userId,
        action: "dividend_added",
        previousValue: previous,
        newValue: next.totalDividends,
      });
    }

    if (typeof input.currentBalance === "number") {
      const previous = next.currentBalance;
      next.currentBalance = roundCurrency(input.currentBalance);
      appendTransaction({
        userId,
        action: "balance_updated",
        previousValue: previous,
        newValue: next.currentBalance,
      });
    }

    state.portfolios = state.portfolios.map((item) => (item.id === next.id ? next : item));
    rebuildPerformance(next, owner.memberSince);
    emit();
    return next;
  },
  updateBalance(userId: string, nextBalance: number) {
    return this.updateInvestment(userId, { currentBalance: nextBalance });
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
    const series = snapshot().performances.find((item) => item.userId === userId);
    if (!series) return [];
    if (range === "ALL") return series.points;
    const days = range === "1M" ? 30 : range === "3M" ? 90 : range === "6M" ? 180 : 365;
    const cutoff = new Date();
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
    const months = ["2025-04", "2025-07", "2025-10", "2026-01", "2026-04", "2026-07", "2026-09"];
    const userGrowth = months.map((month) => ({
      month,
      users: investors.filter((item) => item.memberSince.slice(0, 7) <= month).length,
    }));
    const investmentGrowth = months.map((month) => {
      const date = `${month}-28`;
      const value = activePortfolios.reduce((sum, item) => {
        const series = snapshot().performances.find((entry) => entry.portfolioId === item.id);
        const point = series?.points.find((entry) => entry.date.slice(0, 7) === month) ?? series?.points.at(-1);
        if (item.updatedAt.slice(0, 10) > date && !point) return sum;
        return sum + (point?.value ?? item.currentBalance);
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
  suggestedBalance(userId: string) {
    const portfolio = this.getPortfolioByUser(userId);
    if (!portfolio) return 0;
    return derivedBalance(portfolio.totalDeposit, portfolio.totalProfit, portfolio.totalLoss);
  },
};
