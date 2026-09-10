"use client";

import { PageHeading } from "@/components/layout/page-heading";
import { LeaderboardTable } from "@/components/dashboard/leaderboard-table";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useQuery } from "@/hooks/use-query";
import { getLeaderboard } from "@/services/leaderboard.service";

export default function AdminLeaderboardPage() {
  const query = useQuery(() => getLeaderboard(), []);

  if (query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load the leaderboard." onRetry={query.refetch} />;
  }

  return (
    <div>
      <PageHeading
        title="Leaderboard"
        description="All investors share the same book. Ranked by current balance, identified by UUID only."
      />
      <LeaderboardTable entries={query.data} />
    </div>
  );
}
