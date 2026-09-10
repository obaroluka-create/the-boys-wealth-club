"use client";

import { PageHeading } from "@/components/layout/page-heading";
import { LeaderboardTable } from "@/components/dashboard/leaderboard-table";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery } from "@/hooks/use-query";
import { getLeaderboard } from "@/services/leaderboard.service";

export default function LeaderboardPage() {
  const { session } = useAuth();
  const query = useQuery(() => getLeaderboard(), []);

  if (!session || query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load the leaderboard." onRetry={query.refetch} />;
  }

  return (
    <div>
      <PageHeading
        title="Leaderboard"
        description="Every investor participates in the same collective book. Rankings show current balance by UUID only — names are never displayed."
      />
      <LeaderboardTable entries={query.data} currentUserId={session.userId} />
    </div>
  );
}
