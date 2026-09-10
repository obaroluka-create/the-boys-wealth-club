"use client";

import { PageHeading } from "@/components/layout/page-heading";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@/hooks/use-query";
import { getAnalytics } from "@/services/analytics.service";
import { Landmark, Percent, TrendingDown, TrendingUp } from "lucide-react";
import { shortUuid } from "@/lib/format";

export default function AdminAnalyticsPage() {
  const query = useQuery(() => getAnalytics(), []);

  if (query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load analytics." onRetry={query.refetch} />;
  }

  const data = query.data;

  return (
    <div>
      <PageHeading
        title="Analytics"
        description="Aggregate performance. Rankings on this page use UUIDs rather than names."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average user performance"
          value={data.averageUserPerformance}
          icon={Percent}
          format="percent"
          tone={data.averageUserPerformance >= 0 ? "gain" : "loss"}
        />
        <StatCard
          label="Total investment growth"
          value={data.totalPortfolioValue - data.totalInvestmentCapital}
          icon={TrendingUp}
          tone={data.totalPlatformProfitLoss >= 0 ? "gain" : "loss"}
        />
        <StatCard
          label="Platform profit / loss"
          value={data.totalPlatformProfitLoss}
          icon={data.totalPlatformProfitLoss >= 0 ? TrendingUp : TrendingDown}
          tone={data.totalPlatformProfitLoss >= 0 ? "gain" : "loss"}
        />
        <StatCard
          label="Total dividends distributed"
          value={data.totalDividendsDistributed}
          icon={Landmark}
        />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Best-performing portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">UUID</p>
            <p className="mt-2 font-mono text-sm break-all">
              {data.bestPerformingUserId ?? "Not available"}
            </p>
            {data.bestPerformingUserId ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Short reference {shortUuid(data.bestPerformingUserId)}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Worst-performing portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">UUID</p>
            <p className="mt-2 font-mono text-sm break-all">
              {data.worstPerformingUserId ?? "Not available"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
