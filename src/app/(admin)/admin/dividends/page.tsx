"use client";

import { PageHeading } from "@/components/layout/page-heading";
import { DividendsTable } from "@/components/dashboard/dividends-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useQuery } from "@/hooks/use-query";
import { listDividends } from "@/services/dividends.service";
import { Landmark } from "lucide-react";

export default function AdminDividendsPage() {
  const query = useQuery(() => listDividends(), []);

  if (query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load dividends." onRetry={query.refetch} />;
  }

  const items = [...query.data].sort((a, b) => b.date.localeCompare(a.date));
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div>
      <PageHeading
        title="Dividends"
        description="All recorded distributions across investor portfolios."
      />
      <div className="mb-6 max-w-sm">
        <StatCard label="Total distributed" value={total} icon={Landmark} />
      </div>
      <DividendsTable items={items} />
    </div>
  );
}
