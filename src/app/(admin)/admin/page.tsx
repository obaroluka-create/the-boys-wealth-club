"use client";

import { useEffect, useState } from "react";
import { Landmark, TrendingUp, Users, Wallet, PiggyBank } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeading } from "@/components/layout/page-heading";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@/hooks/use-query";
import { getAnalytics } from "@/services/analytics.service";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const query = useQuery(() => getAnalytics(), []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load platform analytics." onRetry={query.refetch} />;
  }

  const data = query.data;
  const tone = data.totalPlatformProfitLoss >= 0 ? "gain" : "loss";

  return (
    <div>
      <PageHeading
        title="Platform overview"
        description="Firm-wide capital, performance, and distribution at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total users" value={data.totalUsers} icon={Users} format="integer" />
        <StatCard label="Total investment capital" value={data.totalInvestmentCapital} icon={PiggyBank} />
        <StatCard label="Total portfolio value" value={data.totalPortfolioValue} icon={Wallet} />
        <StatCard
          label="Total platform profit / loss"
          value={data.totalPlatformProfitLoss}
          icon={TrendingUp}
          tone={tone}
        />
        <StatCard
          label="Total dividends distributed"
          value={data.totalDividendsDistributed}
          icon={Landmark}
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Total portfolio performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {!mounted ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.investmentGrowth}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(value: number) => formatCurrency(value).replace(/\.00$/, "")}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>User growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {!mounted ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.userGrowth}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="users" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
