import { EmptyState } from "@/components/states/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Deposit } from "@/types";

export function DepositsTable({ items }: { items: Deposit[] }) {
  const rows = [...items].sort((a, b) => b.date.localeCompare(a.date));

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No deposits recorded yet."
        description="Opening and later contributions will appear here as they are recorded."
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">{formatDate(item.date)}</td>
                <td className="px-4 py-3">{item.note ?? "Deposit"}</td>
                <td className="financial px-4 py-3 text-right">{formatCurrency(item.amount, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((item) => (
          <article key={item.id} className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">{item.note ?? "Deposit"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.date)}</p>
            <p className="mt-2 financial text-lg">{formatCurrency(item.amount, true)}</p>
          </article>
        ))}
      </div>
    </>
  );
}
