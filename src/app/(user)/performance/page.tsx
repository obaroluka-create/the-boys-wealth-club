"use client";

import { useState } from "react";
import { PageHeading } from "@/components/layout/page-heading";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { MonthlyBreakdown } from "@/components/dashboard/monthly-breakdown";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery } from "@/hooks/use-query";
import { getPerformance, getPortfolio } from "@/services/investments.service";
import { getPortfolioMetrics } from "@/lib/portfolio-metrics";
import { Percent, TrendingUp } from "lucide-react";
import type { TimeRange } from "@/types";

export default function PerformancePage() {
  const { session } = useAuth();
  const [range, setRange] = useState<TimeRange>("ALL");
  const portfolioQuery = useQuery(() => getPortfolio(session!.userId), [session?.userId], Boolean(session));
  const performanceQuery = useQuery(
    () => getPerformance(session!.userId, range),
    [session?.userId, range],
    Boolean(session),
  );
  const allTimeQuery = useQuery(() => getPerformance(session!.userId, "ALL"), [session?.userId], Boolean(session));

  if (!session || portfolioQuery.status === "loading") return <PageSkeleton />;
  if (portfolioQuery.status === "error") {
    return <ErrorState title="Unable to load portfolio data." onRetry={portfolioQuery.refetch} />;
  }

  const metrics = getPortfolioMetrics(portfolioQuery.data);

  return (
    <div>
      <PageHeading
        title="Performance"
        description="Growth and decline versus your total deposit."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Net performance"
          value={metrics.netPct}
          icon={Percent}
          format="percent"
          tone={metrics.netPct >= 0 ? "gain" : "loss"}
        />
        <StatCard
          label="Net profit / loss"
          value={metrics.net}
          icon={TrendingUp}
          tone={metrics.net >= 0 ? "gain" : "loss"}
        />
      </div>
      <div className="mt-6 space-y-6">
        {performanceQuery.status === "success" ? (
          <PerformanceChart points={performanceQuery.data} range={range} onRangeChange={setRange} />
        ) : (
          <PageSkeleton />
        )}
        {allTimeQuery.status === "success" ? (
          <MonthlyBreakdown points={allTimeQuery.data} />
        ) : null}
      </div>
    </div>
  );
}
