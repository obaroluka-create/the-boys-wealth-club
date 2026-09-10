import { platformDb } from "@/data/mock/db";
import { callService } from "@/services/client";

export async function listDividends(userId?: string) {
  const path = userId ? `/users/${userId}/dividends` : "/dividends";
  return callService(path, { method: "GET" }, () => platformDb.listDividends(userId));
}
