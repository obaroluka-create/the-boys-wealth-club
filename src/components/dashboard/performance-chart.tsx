"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PortfolioPerformancePoint, TimeRange } from "@/types";

const RANGES: TimeRange[] = ["1M", "3M", "6M", "1Y", "ALL"];

const RANGE_LABEL: Record<TimeRange, string> = {
  "1M": "1 Month",
  "3M": "3 Months",
  "6M": "6 Months",
  "1Y": "1 Year",
  ALL: "All Time",
};

export function PerformanceChart({
  points,
  range,
  onRangeChange,
  title = "Portfolio performance",
}: {
  points: PortfolioPerformancePoint[];
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        label: formatDate(point.date),
      })),
    [points],
  );

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Time range">
          {RANGES.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={range === item ? "default" : "outline"}
              onClick={() => onRangeChange(item)}
              aria-pressed={range === item}
            >
              {RANGE_LABEL[item]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {!mounted ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="meridianValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={(value: number) =>
                    formatCurrency(value).replace(".00", "")
                  }
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const point = payload[0].payload as PortfolioPerformancePoint & {
                      label: string;
                    };
                    return (
                      <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium">{point.label}</p>
                        <p className="financial mt-1">{formatCurrency(point.value, true)}</p>
                        <p
                          className={cn(
                            "mt-0.5",
                            point.percentageChange >= 0 ? "text-gain" : "text-loss",
                          )}
                        >
                          {formatPercent(point.percentageChange)} vs total deposit
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#meridianValue)"
                  name="Portfolio value"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="sr-only">
          Portfolio value over the selected range, ending at{" "}
          {data.at(-1) ? formatCurrency(data.at(-1)!.value) : "an unavailable value"}.
        </p>
      </CardContent>
    </Card>
  );
}
