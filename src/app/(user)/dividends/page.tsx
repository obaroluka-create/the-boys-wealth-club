"use client";

import { Landmark, Receipt } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { StatCard } from "@/components/dashboard/stat-card";
import { DividendsTable } from "@/components/dashboard/dividends-table";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery } from "@/hooks/use-query";
import { listDividends } from "@/services/dividends.service";
import { formatDate } from "@/lib/format";

export default function DividendsPage() {
  const { session } = useAuth();
  const query = useQuery(() => listDividends(session!.userId), [session?.userId], Boolean(session));

  if (!session || query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load dividend history." onRetry={query.refetch} />;
  }

  const items = [...query.data].sort((a, b) => b.date.localeCompare(a.date));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const latest = items[0];

  return (
    <div>
      <PageHeading title="Dividends" description="Distributions recorded against your portfolio." />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total dividends earned" value={total} icon={Landmark} />
        <StatCard
          label="Most recent dividend"
          value={latest?.amount ?? 0}
          icon={Receipt}
          hint={latest ? formatDate(latest.date) : "No distribution yet"}
        />
      </div>
      <div className="mt-6">
        <DividendsTable items={items} />
      </div>
    </div>
  );
}
