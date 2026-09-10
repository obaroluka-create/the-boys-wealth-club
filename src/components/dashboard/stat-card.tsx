import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/format";

type Tone = "neutral" | "gain" | "loss";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  percent,
  format = "currency",
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  percent?: number;
  format?: "currency" | "percent" | "integer";
}) {
  const TrendIcon =
    tone === "gain" ? ArrowUpRight : tone === "loss" ? ArrowDownRight : Minus;

  return (
    <Card className="shadow-none">
      <CardContent className="pt-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p
              className={cn(
                "financial mt-2 text-2xl font-semibold tracking-tight",
                tone === "gain" && "text-gain",
                tone === "loss" && "text-loss",
              )}
            >
              {format === "currency"
                ? formatCurrency(value)
                : format === "percent"
                  ? formatPercent(value)
                  : value.toLocaleString("en-NG")}
            </p>
          </div>
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              tone === "gain" && "bg-gain/10 text-gain",
              tone === "loss" && "bg-loss/10 text-loss",
              tone === "neutral" && "bg-muted text-foreground",
            )}
            aria-hidden
          >
            <Icon className="size-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          {percent !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                tone === "gain" && "text-gain",
                tone === "loss" && "text-loss",
                tone === "neutral" && "text-muted-foreground",
              )}
            >
              <TrendIcon className="size-3.5" />
              {formatPercent(percent)}
              <span className="sr-only">
                {tone === "gain" ? "increase" : tone === "loss" ? "decrease" : "unchanged"}
              </span>
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
