import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPortfolioMetrics } from "@/lib/portfolio-metrics";
import { cn } from "@/lib/utils";
import type { InvestmentPortfolio } from "@/types";

const rows = [
  { key: "totalDeposit", label: "Total deposit" },
  { key: "currentBalance", label: "Current portfolio balance" },
  { key: "totalProfit", label: "Total profit" },
  { key: "totalLoss", label: "Total loss" },
  { key: "net", label: "Net profit / loss" },
  { key: "netPct", label: "Profit / loss percentage" },
  { key: "totalDividends", label: "Total dividends" },
] as const;

export function PortfolioSummary({ portfolio }: { portfolio: InvestmentPortfolio }) {
  const metrics = getPortfolioMetrics(portfolio);
  const values: Record<(typeof rows)[number]["key"], number> = {
    totalDeposit: portfolio.totalDeposit,
    currentBalance: portfolio.currentBalance,
    totalProfit: portfolio.totalProfit,
    totalLoss: portfolio.totalLoss,
    net: metrics.net,
    netPct: metrics.netPct,
    totalDividends: portfolio.totalDividends,
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Investment summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <dl className="divide-y">
          {rows.map((row) => {
            const value = values[row.key];
            const tone =
              row.key === "totalProfit" || (row.key === "net" && value > 0) || (row.key === "netPct" && value > 0)
                ? "gain"
                : row.key === "totalLoss" || (row.key === "net" && value < 0) || (row.key === "netPct" && value < 0)
                  ? "loss"
                  : "neutral";
            return (
              <div key={row.key} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd
                  className={cn(
                    "financial text-sm font-medium",
                    tone === "gain" && "text-gain",
                    tone === "loss" && "text-loss",
                  )}
                >
                  {row.key === "netPct" ? formatPercent(value) : formatCurrency(value, true)}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
