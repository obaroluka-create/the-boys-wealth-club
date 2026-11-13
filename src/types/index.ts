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
  | "password_reset_requested"
  | "password_reset_issued"
  | "password_changed";
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
  /** Book units held. Balance = units × current unit price. */
  units: number;
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
  /** Units bought by this deposit, fixed when it is recorded. */
  units: number;
  /** Unit price the deposit bought in at. */
  unitPrice: number;
  date: string;
  note?: string;
}

/**
 * Shared stock book every investor holds units in.
 * Recording performance moves the unit price; it never changes anyone's units.
 */
export interface CollectiveBook {
  unitPrice: number;
  launchUnitPrice: number;
  launchedAt: string;
  updatedAt: string;
  /** Change applied by the most recent valuation, in percent. */
  lastChangePercent: number;
}

/** One recorded book valuation (price history entry). */
export interface BookValuation {
  id: string;
  date: string;
  unitPrice: number;
  previousUnitPrice: number;
  changePercent: number;
  profitPercent: number;
  lossPercent: number;
}

export interface PortfolioPerformancePoint {
  date: string;
  value: number;
  percentageChange: number;
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
  /** Set after an administrator issues a temporary password; the user must choose a new one. */
  mustChangePassword?: boolean;
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

export interface RecordDepositInput {
  amount: number;
  note?: string;
}

export interface RecordDividendInput {
  amount: number;
  type?: DividendType;
}

/** Performance for one period; the unit price moves by profit − loss percent. */
export interface UpdateBookInput {
  profitPercent: number;
  lossPercent: number;
}

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  session: Session;
  /** Only the mock platform returns a token; the real API uses an httpOnly cookie. */
  token?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** A new account and the one-time password to hand to its owner. */
export interface CreatedUser {
  user: User;
  temporaryPassword: string;
}
