"use client";

import { useParams } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { InvestmentEditor } from "@/components/admin/investment-editor";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useQuery } from "@/hooks/use-query";
import { getUser } from "@/services/users.service";
import { getPortfolio } from "@/services/investments.service";
import { listTransactions } from "@/services/transactions.service";

export default function InvestmentDetailPage() {
  const params = useParams<{ id: string }>();
  const userQuery = useQuery(() => getUser(params.id), [params.id]);
  const portfolioQuery = useQuery(() => getPortfolio(params.id), [params.id]);
  const activityQuery = useQuery(() => listTransactions(params.id), [params.id]);

  if (userQuery.status === "loading" || portfolioQuery.status === "loading") {
    return <PageSkeleton />;
  }
  if (userQuery.status === "error" || portfolioQuery.status === "error") {
    return <ErrorState title="Unable to load this investment record." />;
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Investment record"
        description={`${userQuery.data.fullName} · ${userQuery.data.id}`}
      />
      <InvestmentEditor user={userQuery.data} portfolio={portfolioQuery.data} />
      {activityQuery.status === "success" ? (
        <ActivityFeed items={activityQuery.data.slice(0, 12)} />
      ) : null}
    </div>
  );
}
