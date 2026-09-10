import { platformDb } from "@/data/mock/db";
import { callService } from "@/services/client";

export async function listTransactions(userId?: string) {
  const path = userId ? `/users/${userId}/transactions` : "/transactions";
  return callService(path, { method: "GET" }, () => platformDb.listTransactions(userId));
}
