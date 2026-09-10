"use client";

import Link from "next/link";
import { PageHeading } from "@/components/layout/page-heading";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { getPortfolioMetrics } from "@/lib/portfolio-metrics";
import { useQuery } from "@/hooks/use-query";
import { listUsers } from "@/services/users.service";

export default function PortfolioManagementPage() {
  const query = useQuery(
    () =>
      listUsers({
        page: 1,
        pageSize: 50,
        sortBy: "investment",
        sortDir: "desc",
        status: "all",
        search: "",
      }),
    [],
  );

  if (query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load portfolios." onRetry={query.refetch} />;
  }

  return (
    <div>
      <PageHeading
        title="Portfolio management"
        description="Firm-level view of each investor mandate."
      />
      <div className="grid gap-4">
        {query.data.items.map((row) => {
          const metrics = row.portfolio ? getPortfolioMetrics(row.portfolio) : null;
          return (
            <article key={row.user.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{row.user.fullName}</p>
                  <p className="font-mono text-xs break-all text-muted-foreground">{row.user.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.portfolio?.reference ?? "No portfolio"}
                  </p>
                </div>
                {row.portfolio && metrics ? (
                  <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Total deposit</dt>
                      <dd className="financial">{formatCurrency(row.portfolio.totalDeposit)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Balance</dt>
                      <dd className="financial">{formatCurrency(row.portfolio.currentBalance)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Net</dt>
                      <dd className="financial">{formatCurrency(metrics.net)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Dividends</dt>
                      <dd className="financial">{formatCurrency(row.portfolio.totalDividends)}</dd>
                    </div>
                  </dl>
                ) : null}
                <Button asChild variant="outline">
                  <Link href={`/admin/investments/${row.user.id}`}>Update</Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
