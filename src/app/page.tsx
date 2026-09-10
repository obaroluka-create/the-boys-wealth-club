"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { PageSkeleton } from "@/components/states/page-skeleton";

export default function HomePage() {
  const { session, status, homePath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    router.replace(session ? homePath : "/login");
  }, [homePath, router, session, status]);

  return <PageSkeleton />;
}
