import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-state";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

export function LeaderboardTable({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}) {
  if (entries.length === 0) {
    return <EmptyState title="Leaderboard is unavailable." />;
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Current balance ranking</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="space-y-2">
          {entries.map((entry) => {
            const isCurrent = entry.userId === currentUserId;
            return (
              <li
                key={entry.userId}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                  isCurrent && "border-primary/30 bg-primary/5",
                )}
              >
                <div className="flex items-start gap-4">
                  <span className="financial w-8 text-sm font-semibold text-muted-foreground">
                    {entry.rank}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      UUID
                    </p>
                    <p className="font-mono text-xs break-all sm:text-sm">{entry.userId}</p>
                    {isCurrent ? (
                      <Badge variant="secondary" className="mt-2">
                        Your position
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <p className="financial text-sm font-semibold">{formatCurrency(entry.currentBalance)}</p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
