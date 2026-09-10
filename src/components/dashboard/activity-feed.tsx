import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Transaction, TransactionAction } from "@/types";

const ACTION_LABEL: Record<TransactionAction, string> = {
  balance_updated: "Balance updated",
  profit_added: "Profit added",
  loss_recorded: "Loss recorded",
  dividend_added: "Dividend added",
  deposit_recorded: "Deposit recorded",
  book_updated: "Book performance updated",
  account_created: "Account created",
  account_activated: "Account activated",
  account_disabled: "Account disabled",
  profile_updated: "Profile updated",
  password_reset_requested: "Password reset requested",
};

export function ActivityFeed({
  items,
  title = "Activity history",
}: {
  items: Transaction[];
  title?: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="No activity recorded yet." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{ACTION_LABEL[item.action]}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(item.date)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.previousValue !== null && item.newValue !== null
                  ? `${formatCurrency(item.previousValue, true)} → ${formatCurrency(item.newValue, true)}`
                  : item.note ?? "Completed"}
              </p>
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                {item.status}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
