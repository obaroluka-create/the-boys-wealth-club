"use client";

import { PageHeading } from "@/components/layout/page-heading";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery } from "@/hooks/use-query";
import { getPortfolio, listDeposits } from "@/services/investments.service";
import { DepositsTable } from "@/components/dashboard/deposits-table";
import { getPortfolioMetrics } from "@/lib/portfolio-metrics";
import { Briefcase, Landmark, TrendingUp, Wallet } from "lucide-react";

export default function PortfolioPage() {
  const { session } = useAuth();
  const query = useQuery(() => getPortfolio(session!.userId), [session?.userId], Boolean(session));
  const depositsQuery = useQuery(
    () => listDeposits(session!.userId),
    [session?.userId],
    Boolean(session),
  );

  if (!session || query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load portfolio data." onRetry={query.refetch} />;
  }

  const metrics = getPortfolioMetrics(query.data);

  return (
    <div>
      <PageHeading
        title="Portfolio"
        description={`Reference ${query.data.reference}. Figures are held for your account only.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current balance" value={query.data.currentBalance} icon={Wallet} />
        <StatCard label="Total deposit" value={query.data.totalDeposit} icon={Briefcase} />
        <StatCard
          label="Net profit / loss"
          value={metrics.net}
          icon={TrendingUp}
          tone={metrics.net >= 0 ? "gain" : "loss"}
          percent={metrics.netPct}
        />
        <StatCard label="Dividends" value={query.data.totalDividends} icon={Landmark} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PortfolioSummary portfolio={query.data} />
        <div>
          <h2 className="mb-3 font-heading text-2xl">Deposits</h2>
          {depositsQuery.status === "success" ? (
            <DepositsTable items={depositsQuery.data} />
          ) : depositsQuery.status === "error" ? (
            <ErrorState title="Unable to load deposits." onRetry={depositsQuery.refetch} />
          ) : (
            <PageSkeleton />
          )}
        </div>
      </div>
    </div>
  );
}
