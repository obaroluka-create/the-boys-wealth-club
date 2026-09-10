export type UserRole = "admin" | "user";
export type AccountStatus = "active" | "disabled" | "pending";
export type DividendType = "quarterly" | "special" | "annual";
export type DividendStatus = "paid" | "pending" | "processing";
export type TransactionAction =
  | "balance_updated"
  | "profit_added"
  | "loss_recorded"
  | "dividend_added"
  | "deposit_recorded"
  | "book_updated"
  | "account_created"
  | "account_activated"
  | "account_disabled"
  | "profile_updated"
  | "password_reset_requested";
export type TransactionStatus = "completed" | "pending" | "failed";
export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "ALL";

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: UserRole;
  status: AccountStatus;
  memberSince: string;
  imageUrl: string;
}

export interface Admin extends User {
  role: "admin";
}

export interface InvestmentPortfolio {
  id: string;
  userId: string;
  reference: string;
  /** Sum of all deposits into the portfolio, including later additions. */
  totalDeposit: number;
  currentBalance: number;
  totalProfit: number;
  totalLoss: number;
  totalDividends: number;
  updatedAt: string;
}

export interface Deposit {
  id: string;
  userId: string;
  portfolioId: string;
  amount: number;
  date: string;
  note?: string;
}

/** Shared stock book applied to every investor at the same time. */
export interface CollectiveBook {
  profitRate: number;
  lossRate: number;
  updatedAt: string;
}

export interface PortfolioPerformancePoint {
  date: string;
  value: number;
  percentageChange: number;
}

export interface PortfolioPerformance {
  userId: string;
  portfolioId: string;
  points: PortfolioPerformancePoint[];
}

export interface Dividend {
  id: string;
  userId: string;
  portfolioId: string;
  portfolioReference: string;
  date: string;
  type: DividendType;
  amount: number;
  status: DividendStatus;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  action: TransactionAction;
  previousValue: number | null;
  newValue: number | null;
  status: TransactionStatus;
  note?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  currentBalance: number;
}

export interface Session {
  userId: string;
  uuid: string;
  role: UserRole;
  email: string;
  username: string;
  fullName: string;
  status: AccountStatus;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalInvestmentCapital: number;
  totalPortfolioValue: number;
  totalPlatformProfitLoss: number;
  totalDividendsDistributed: number;
  averageUserPerformance: number;
  bestPerformingUserId: string | null;
  worstPerformingUserId: string | null;
  userGrowth: { month: string; users: number }[];
  investmentGrowth: { month: string; value: number }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserAccountRow {
  user: User;
  portfolio: InvestmentPortfolio | null;
  performancePercentage: number;
}

export interface UserQuery {
  search?: string;
  status?: AccountStatus | "all";
  sortBy?: "name" | "investment" | "balance";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  totalDeposit: number;
  status: AccountStatus;
  id?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  status?: AccountStatus;
  imageUrl?: string;
}

export interface InvestmentUpdateInput {
  currentBalance?: number;
  dividendAmount?: number;
}

export interface RecordDepositInput {
  amount: number;
  note?: string;
}

export interface RecordDividendInput {
  amount: number;
}

export interface UpdateBookInput {
  incrementalProfitPercent: number;
  incrementalLossPercent: number;
}

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  session: Session;
  token: string;
}
