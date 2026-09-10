"use client";

import { Landmark, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { StatCard } from "@/components/dashboard/stat-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery } from "@/hooks/use-query";
import { getPerformance, getPortfolio, listDeposits } from "@/services/investments.service";
import { DepositsTable } from "@/components/dashboard/deposits-table";
import { getPortfolioMetrics } from "@/lib/portfolio-metrics";
import { useState } from "react";
import type { TimeRange } from "@/types";

export default function UserDashboardPage() {
  const { session } = useAuth();
  const [range, setRange] = useState<TimeRange>("1Y");
  const portfolioQuery = useQuery(
    () => getPortfolio(session!.userId),
    [session?.userId],
    Boolean(session),
  );
  const performanceQuery = useQuery(
    () => getPerformance(session!.userId, range),
    [session?.userId, range],
    Boolean(session),
  );
  const depositsQuery = useQuery(
    () => listDeposits(session!.userId),
    [session?.userId],
    Boolean(session),
  );

  if (!session) return <PageSkeleton />;
  if (portfolioQuery.status === "loading") return <PageSkeleton />;
  if (portfolioQuery.status === "error") {
    return (
      <ErrorState
        title="Unable to load portfolio data."
        description={portfolioQuery.error}
        onRetry={portfolioQuery.refetch}
      />
    );
  }

  const portfolio = portfolioQuery.data;
  const metrics = getPortfolioMetrics(portfolio);
  const tone = metrics.net > 0 ? "gain" : metrics.net < 0 ? "loss" : "neutral";

  return (
    <div>
      <PageHeading
        title={`Welcome back, ${session.fullName}`}
        description="A concise view of your private portfolio position."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Current balance"
          value={portfolio.currentBalance}
          icon={Wallet}
          hint="Portfolio value"
        />
        <StatCard
          label="Total deposit"
          value={portfolio.totalDeposit}
          icon={PiggyBank}
          hint="All deposits to date"
        />
        <StatCard
          label="Total profit / loss"
          value={metrics.net}
          icon={metrics.net >= 0 ? TrendingUp : TrendingDown}
          tone={tone}
          percent={metrics.netPct}
        />
        <StatCard
          label="Profit / loss percentage"
          value={metrics.netPct}
          icon={TrendingUp}
          tone={tone}
          format="percent"
          hint="Vs total deposit"
        />
        <StatCard
          label="Total dividends"
          value={portfolio.totalDividends}
          icon={Landmark}
          hint="Distributed"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        {performanceQuery.status === "success" ? (
          <PerformanceChart points={performanceQuery.data} range={range} onRangeChange={setRange} />
        ) : performanceQuery.status === "error" ? (
          <ErrorState title="Unable to load performance." onRetry={performanceQuery.refetch} />
        ) : (
          <PageSkeleton />
        )}
        <PortfolioSummary portfolio={portfolio} />
      </div>
      <div className="mt-6">
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
  );
}
