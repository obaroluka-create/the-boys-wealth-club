"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPercent } from "@/lib/format";
import { getBook, updateBook } from "@/services/investments.service";
import { useQuery } from "@/hooks/use-query";

export function BookPerformanceCard() {
  const query = useQuery(() => getBook(), []);
  const [profit, setProfit] = useState("");
  const [loss, setLoss] = useState("");
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    if (query.status !== "success") return null;
    const profitDelta = Number(profit) || 0;
    const lossDelta = Number(loss) || 0;
    const nextProfitRate = query.data.profitRate + profitDelta / 100;
    const nextLossRate = Math.max(0, query.data.lossRate + lossDelta / 100);
    return (nextProfitRate - nextLossRate) * 100;
  }, [loss, profit, query]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await updateBook({
        incrementalProfitPercent: Number(profit) || 0,
        incrementalLossPercent: Number(loss) || 0,
      });
      toast.success("Book performance applied to every investor.");
      setProfit("");
      setLoss("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the book.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Collective book</CardTitle>
      </CardHeader>
      <CardContent>
        {query.status === "error" ? (
          <p className="text-sm text-muted-foreground">Unable to load the shared book.</p>
        ) : query.status !== "success" ? (
          <p className="text-sm text-muted-foreground">Loading book rates…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Every investor is in the same stock book at the same time. Recording performance here
              updates all portfolios to the same percentage.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Book profit rate" value={formatPercent(query.data.profitRate * 100)} />
              <Metric label="Book loss rate" value={formatPercent(query.data.lossRate * 100)} />
              <Metric
                label="Net book performance"
                value={formatPercent((query.data.profitRate - query.data.lossRate) * 100)}
              />
            </dl>
            <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="book-profit">Period profit %</Label>
                <Input
                  id="book-profit"
                  type="number"
                  step="0.01"
                  value={profit}
                  onChange={(event) => setProfit(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="book-loss">Period loss %</Label>
                <Input
                  id="book-loss"
                  type="number"
                  step="0.01"
                  min="0"
                  value={loss}
                  onChange={(event) => setLoss(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Apply to all
              </Button>
            </form>
            {preview !== null ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Projected net book performance: {formatPercent(preview)}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="financial mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
