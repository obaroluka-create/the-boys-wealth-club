"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { homeForRole } from "@/services/auth.service";
import { PageSkeleton } from "@/components/states/page-skeleton";
import type { UserRole } from "@/types";

export function AuthGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { session, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role !== role) {
      router.replace(homeForRole(session.role));
    }
  }, [role, router, session, status]);

  if (status === "loading" || !session || session.role !== role) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}
