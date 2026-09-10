"use client";

import Link from "next/link";
import { PageHeading } from "@/components/layout/page-heading";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { ChangeIndicator } from "@/components/dashboard/change-indicator";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@/hooks/use-query";
import { BookPerformanceCard } from "@/components/admin/book-performance-card";
import { listUsers } from "@/services/users.service";

export default function InvestmentsIndexPage() {
  const query = useQuery(
    () =>
      listUsers({
        search: "",
        status: "all",
        sortBy: "balance",
        sortDir: "desc",
        page: 1,
        pageSize: 50,
      }),
    [],
  );

  if (query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load investments." onRetry={query.refetch} />;
  }

  return (
    <div>
      <PageHeading
        title="Investments"
        description="Update the shared book, then manage each investor’s deposits and dividends."
      />
      <div className="mb-6">
        <BookPerformanceCard />
      </div>
      {query.data.items.length === 0 ? (
        <EmptyState title="No users found." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">UUID</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Performance</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((row) => (
                <tr key={row.user.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{row.user.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.user.id}</td>
                  <td className="financial px-4 py-3">
                    {row.portfolio ? formatCurrency(row.portfolio.currentBalance) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ChangeIndicator value={row.performancePercentage} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/investments/${row.user.id}`}>Manage</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
