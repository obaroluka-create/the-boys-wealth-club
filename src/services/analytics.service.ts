import { platformDb } from "@/data/mock/db";
import { callService } from "@/services/client";

export async function getAnalytics() {
  return callService("/admin/analytics", { method: "GET" }, () => platformDb.getAnalytics());
}
