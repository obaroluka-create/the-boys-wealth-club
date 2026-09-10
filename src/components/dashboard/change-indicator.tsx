import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

export function ChangeIndicator({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const tone = value > 0 ? "gain" : value < 0 ? "loss" : "neutral";
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        tone === "gain" && "text-gain",
        tone === "loss" && "text-loss",
        tone === "neutral" && "text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {formatPercent(value)}
      <span className="sr-only">
        {tone === "gain" ? "positive" : tone === "loss" ? "negative" : "flat"}
      </span>
    </span>
  );
}
