"use client";

import { PiggyBank, Receipt } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { StatCard } from "@/components/dashboard/stat-card";
import { DepositsTable } from "@/components/dashboard/deposits-table";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery } from "@/hooks/use-query";
import { listDeposits } from "@/services/investments.service";
import { formatDate } from "@/lib/format";

export default function DepositsPage() {
  const { session } = useAuth();
  const query = useQuery(() => listDeposits(session!.userId), [session?.userId], Boolean(session));

  if (!session || query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load deposit history." onRetry={query.refetch} />;
  }

  const items = [...query.data].sort((a, b) => b.date.localeCompare(a.date));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const latest = items[0];
  const recurring = items.filter((item) => item.note !== "Opening deposit").length;

  return (
    <div>
      <PageHeading
        title="Deposits"
        description="Opening capital and later contributions recorded against your portfolio."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total deposit" value={total} icon={PiggyBank} hint="All contributions to date" />
        <StatCard
          label="Most recent deposit"
          value={latest?.amount ?? 0}
          icon={Receipt}
          hint={latest ? formatDate(latest.date) : "No deposit yet"}
        />
        <StatCard label="Later contributions" value={recurring} icon={PiggyBank} format="integer" />
      </div>
      <div className="mt-6">
        <DepositsTable items={items} />
      </div>
    </div>
  );
}
