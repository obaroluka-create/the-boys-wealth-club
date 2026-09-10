/**
 * Users service
 *
 * GET/POST /users
 * GET/PATCH /users/:id
 * PATCH /users/:id/status
 */

import { platformDb } from "@/data/mock/db";
import { invalidateQueries } from "@/lib/query";
import { ApiError, callService } from "@/services/client";
import { portfolioPerformancePercentage } from "@/utils/investmentCalculations";
import type {
  AccountStatus,
  CreateUserInput,
  Paginated,
  UpdateUserInput,
  User,
  UserAccountRow,
  UserQuery,
} from "@/types";

function toQueryString(query?: UserQuery) {
  const params = new URLSearchParams();
  if (!query) return "";
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

function toRows(result: Paginated<User>): Paginated<UserAccountRow> {
  return {
    ...result,
    items: result.items.map((user) => {
      const portfolio = platformDb.getPortfolioByUser(user.id);
      return {
        user,
        portfolio,
        performancePercentage: portfolio ? portfolioPerformancePercentage(portfolio) : 0,
      };
    }),
  };
}

export async function listUsers(query?: UserQuery): Promise<Paginated<UserAccountRow>> {
  return callService(`/users${toQueryString(query)}`, { method: "GET" }, () =>
    toRows(platformDb.queryUsers(query)),
  );
}

export async function getUser(id: string): Promise<User> {
  return callService(`/users/${id}`, { method: "GET" }, () => {
    const user = platformDb.getUser(id);
    if (!user) throw new ApiError("User not found.", 404);
    return user;
  });
}

export async function createUser(input: CreateUserInput): Promise<User> {
  if (!input.fullName.trim() || !input.email.trim()) {
    throw new ApiError("Full name and email are required.");
  }
  if (input.totalDeposit <= 0) {
    throw new ApiError("Total deposit must be greater than zero.");
  }
  const user = await callService("/users", { method: "POST", body: JSON.stringify(input) }, () =>
    platformDb.createUser(input),
  );
  invalidateQueries();
  return user;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const user = await callService(`/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }, () =>
    platformDb.updateUser(id, input),
  );
  invalidateQueries();
  return user;
}

export async function setUserStatus(id: string, status: AccountStatus): Promise<User> {
  const user = await callService(
    `/users/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
    () => platformDb.setUserStatus(id, status),
  );
  invalidateQueries();
  return user;
}

export async function listAdministrators(): Promise<User[]> {
  return callService("/users?role=admin", { method: "GET" }, () =>
    platformDb.listUsers().filter((user) => user.role === "admin"),
  );
}
