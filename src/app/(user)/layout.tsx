import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="user">
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
