import { auditLog } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import type { TransactionAction } from "@/types";

export interface AuditEntry {
  actorId?: string | null;
  subjectUserId?: string | null;
  action: TransactionAction;
  previousValue?: bigint | null;
  newValue?: bigint | null;
  note?: string | null;
}

/** Append entries to the audit log (also the activity history shown in the app). */
export async function audit(db: Db, ...entries: AuditEntry[]) {
  if (entries.length === 0) return;
  await db.insert(auditLog).values(
    entries.map((entry) => ({
      actorId: entry.actorId ?? null,
      subjectUserId: entry.subjectUserId ?? null,
      action: entry.action,
      previousValue: entry.previousValue ?? null,
      newValue: entry.newValue ?? null,
      note: entry.note ?? null,
    })),
  );
}
