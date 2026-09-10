import { EmptyState } from "@/components/states/empty-state";
import { DividendStatusBadge } from "@/components/ui-blocks/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Dividend } from "@/types";

export function DividendsTable({ items }: { items: Dividend[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No dividend history available."
        description="Distributions will appear here once they are recorded for this portfolio."
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
              <th className="px-4 py-3 font-medium">Dividend type</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Portfolio reference</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">{formatDate(item.date)}</td>
                <td className="px-4 py-3 capitalize">{item.type}</td>
                <td className="financial px-4 py-3">{formatCurrency(item.amount, true)}</td>
                <td className="px-4 py-3 font-mono text-xs">{item.portfolioReference}</td>
                <td className="px-4 py-3">
                  <DividendStatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{formatDate(item.date)}</p>
              <DividendStatusBadge status={item.status} />
            </div>
            <p className="mt-2 financial text-lg">{formatCurrency(item.amount, true)}</p>
            <p className="mt-1 text-xs text-muted-foreground capitalize">
              {item.type} · {item.portfolioReference}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
