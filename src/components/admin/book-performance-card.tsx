"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getBook, listBookValuations, updateBook } from "@/services/investments.service";
import { useQuery } from "@/hooks/use-query";
import { applyPeriodReturn, percentChange } from "@/utils/unitAccounting";

export function BookPerformanceCard() {
  const query = useQuery(() => getBook(), []);
  const historyQuery = useQuery(() => listBookValuations(), []);
  const [profit, setProfit] = useState("");
  const [loss, setLoss] = useState("");
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    if (query.status !== "success") return null;
    const profitPercent = Number(profit) || 0;
    const lossPercent = Number(loss) || 0;
    if (profitPercent === 0 && lossPercent === 0) return null;
    const unitPrice = applyPeriodReturn(query.data.unitPrice, profitPercent, lossPercent);
    return { unitPrice, change: percentChange(query.data.unitPrice, unitPrice) };
  }, [loss, profit, query]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const book = await updateBook({
        profitPercent: Number(profit) || 0,
        lossPercent: Number(loss) || 0,
      });
      toast.success(`Unit price is now ${formatCurrency(book.unitPrice, true)} for every investor.`);
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
          <p className="text-sm text-muted-foreground">Loading the book…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Every investor holds units in the same book. Recording a period&apos;s performance moves
              the unit price for everyone; deposits buy units at the price on the day they are
              recorded, so new money only shares in performance from then on.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Unit price" value={formatCurrency(query.data.unitPrice, true)} />
              <Metric
                label="Since launch"
                value={formatPercent(percentChange(query.data.launchUnitPrice, query.data.unitPrice))}
                hint={`From ${formatCurrency(query.data.launchUnitPrice)} on ${formatDate(query.data.launchedAt)}`}
              />
              <Metric
                label="Last period"
                value={formatPercent(query.data.lastChangePercent)}
                hint={`Recorded ${formatDate(query.data.updatedAt)}`}
              />
            </dl>
            <form
              className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
              onSubmit={onSubmit}
            >
              <div className="space-y-2">
                <Label htmlFor="book-profit">Period profit %</Label>
                <Input
                  id="book-profit"
                  type="number"
                  step="0.01"
                  min="0"
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
            {preview ? (
              <p className="mt-3 text-xs text-muted-foreground">
                New unit price: {formatCurrency(preview.unitPrice, true)} (
                {formatPercent(preview.change)})
              </p>
            ) : null}
            {historyQuery.status === "success" && historyQuery.data.length > 0 ? (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Recent valuations
                </p>
                <ul className="divide-y rounded-lg border text-sm">
                  {historyQuery.data.slice(0, 5).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 px-3 py-2">
                      <span className="text-muted-foreground">{formatDate(item.date)}</span>
                      <span className="financial">{formatCurrency(item.unitPrice, true)}</span>
                      <span
                        className={cn(
                          "financial w-20 text-right",
                          item.changePercent > 0 && "text-gain",
                          item.changePercent < 0 && "text-loss",
                        )}
                      >
                        {formatPercent(item.changePercent)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="financial mt-1 text-sm font-medium">{value}</dd>
      {hint ? <dd className="mt-0.5 text-[11px] text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}
