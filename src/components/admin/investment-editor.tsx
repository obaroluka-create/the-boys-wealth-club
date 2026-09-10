"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPortfolioMetrics } from "@/lib/portfolio-metrics";
import { listDeposits, recordDeposit, recordDividend } from "@/services/investments.service";
import { useQuery } from "@/hooks/use-query";
import { DepositsTable } from "@/components/dashboard/deposits-table";
import type { InvestmentPortfolio, User } from "@/types";

export function InvestmentEditor({
  user,
  portfolio,
}: {
  user: User;
  portfolio: InvestmentPortfolio;
}) {
  const current = getPortfolioMetrics(portfolio);
  const depositsQuery = useQuery(() => listDeposits(user.id), [user.id]);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [dividend, setDividend] = useState("");
  const [depositPending, setDepositPending] = useState(false);
  const [dividendPending, setDividendPending] = useState(false);

  async function onDeposit(event: React.FormEvent) {
    event.preventDefault();
    setDepositPending(true);
    try {
      await recordDeposit(user.id, {
        amount: Number(depositAmount),
        note: depositNote.trim() || undefined,
      });
      toast.success("Deposit recorded. Book performance still applies to the new total.");
      setDepositAmount("");
      setDepositNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record deposit.");
    } finally {
      setDepositPending(false);
    }
  }

  async function onDividend(event: React.FormEvent) {
    event.preventDefault();
    setDividendPending(true);
    try {
      await recordDividend(user.id, { amount: Number(dividend) });
      toast.success("Dividend recorded. Dividends are not added to current balance.");
      setDividend("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record dividend.");
    } finally {
      setDividendPending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Current position</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row label="Full name" value={user.fullName} />
          <Row label="UUIDv4" value={user.id} mono />
          <Row label="Total deposit" value={formatCurrency(portfolio.totalDeposit, true)} />
          <Row label="Current balance" value={formatCurrency(portfolio.currentBalance, true)} />
          <Row label="Total profit" value={formatCurrency(portfolio.totalProfit, true)} tone="gain" />
          <Row label="Total loss" value={formatCurrency(portfolio.totalLoss, true)} tone="loss" />
          <Row
            label="Net profit / loss"
            value={formatCurrency(current.net, true)}
            tone={current.net >= 0 ? "gain" : "loss"}
          />
          <Row
            label="Book performance"
            value={formatPercent(current.netPct)}
            tone={current.netPct >= 0 ? "gain" : "loss"}
          />
          <Row label="Dividends" value={formatCurrency(portfolio.totalDividends, true)} />
          <p className="pt-2 text-xs text-muted-foreground">
            Profit and loss come from the collective book. Record book performance on the
            Investments page so every investor stays on the same percentage.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Record deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onDeposit}>
              <Field
                id="deposit"
                label="Amount"
                value={depositAmount}
                onChange={setDepositAmount}
                hint="Adds to total deposit. Book rates are reapplied so performance stays shared."
              />
              <div className="space-y-2">
                <Label htmlFor="deposit-note">Note (optional)</Label>
                <Input
                  id="deposit-note"
                  value={depositNote}
                  onChange={(event) => setDepositNote(event.target.value)}
                  placeholder="Recurring contribution"
                />
              </div>
              <Button type="submit" disabled={depositPending}>
                {depositPending ? <Loader2 className="animate-spin" /> : null}
                Add deposit
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Record dividend</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onDividend}>
              <Field
                id="dividend"
                label="Dividend amount"
                value={dividend}
                onChange={setDividend}
                hint="Firm payout to this investor. Not included in current balance."
              />
              <Button type="submit" disabled={dividendPending}>
                {dividendPending ? <Loader2 className="animate-spin" /> : null}
                Add dividend
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none xl:col-span-2">
        <CardHeader>
          <CardTitle>Deposit history</CardTitle>
        </CardHeader>
        <CardContent>
          {depositsQuery.status === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading deposits…</p>
          ) : depositsQuery.status === "error" ? (
            <p className="text-sm text-muted-foreground">Unable to load deposits.</p>
          ) : (
            <DepositsTable items={depositsQuery.data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "gain" | "loss";
}) {
  return (
    <div className="flex flex-col gap-1 border-b py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={[
          "break-all",
          mono ? "font-mono text-xs" : "financial font-medium",
          tone === "gain" ? "text-gain" : "",
          tone === "loss" ? "text-loss" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
