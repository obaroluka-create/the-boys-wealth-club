"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { PortfolioPerformancePoint } from "@/types";

export function MonthlyBreakdown({ points }: { points: PortfolioPerformancePoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useMemo(() => {
    const lastByMonth = new Map<string, PortfolioPerformancePoint>();
    for (const point of points) {
      lastByMonth.set(point.date.slice(0, 7), point);
    }
    const months = [...lastByMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
    return months.slice(-12).map(([month, point], index, list) => {
      const previous = list[index - 1]?.[1];
      const change = previous
        ? ((point.value - previous.value) / previous.value) * 100
        : point.percentageChange;
      return {
        month,
        label: new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        value: point.value,
        change,
      };
    });
  }, [points]);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Periodic performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          {!mounted ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const row = payload[0].payload as (typeof data)[number];
                    return (
                      <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium">{row.label}</p>
                        <p className="financial mt-1">{formatCurrency(row.value)}</p>
                        <p className={row.change >= 0 ? "text-gain" : "text-loss"}>
                          {formatPercent(row.change)} vs prior period
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="change" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Period change" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
