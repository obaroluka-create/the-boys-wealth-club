import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Account",
};

/** Account pages are open to both roles. */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
