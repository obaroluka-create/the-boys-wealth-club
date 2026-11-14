"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { homeForRole } from "@/services/auth.service";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { CHANGE_PASSWORD_PATH } from "@/lib/constants";
import type { Session, UserRole } from "@/types";

/** Where a session may not be, or null if it may stay on this page. */
function redirectFor(session: Session | null, role: UserRole | undefined, pathname: string) {
  if (!session) return "/login";
  if (session.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) return CHANGE_PASSWORD_PATH;
  if (role && session.role !== role) return homeForRole(session.role);
  return null;
}

/**
 * Client-side page guard. The API enforces the same rules on every request;
 * this only keeps people from seeing pages they cannot use.
 */
export function AuthGuard({ role, children }: { role?: UserRole; children: React.ReactNode }) {
  const { session, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const target = status === "loading" ? null : redirectFor(session, role, pathname);

  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);

  if (status === "loading" || target) return <PageSkeleton />;
  return <>{children}</>;
}
