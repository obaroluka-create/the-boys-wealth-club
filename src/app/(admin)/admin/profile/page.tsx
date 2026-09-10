"use client";

import { PageHeading } from "@/components/layout/page-heading";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery } from "@/hooks/use-query";
import { getUser } from "@/services/users.service";

export default function AdminProfilePage() {
  const { session } = useAuth();
  const query = useQuery(() => getUser(session!.userId), [session?.userId], Boolean(session));

  if (!session || query.status === "loading") return <PageSkeleton />;
  if (query.status === "error") {
    return <ErrorState title="Unable to load profile." onRetry={query.refetch} />;
  }

  return (
    <div>
      <PageHeading title="Profile" description="Administrator identity issued by the firm." />
      <ProfileCard user={query.data} />
    </div>
  );
}
