"use client";

import { usePathname } from "next/navigation";
import { MobileNavigation } from "@/components/layout/mobile-nav";
import { ADMIN_NAV, USER_NAV } from "@/components/layout/nav-config";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppHeader() {
  const pathname = usePathname();
  const { session } = useAuth();
  const items = session?.role === "admin" ? ADMIN_NAV : USER_NAV;
  const current =
    items
      .slice()
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) =>
        item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
      ) ?? items[0];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-background/90 px-4 backdrop-blur-sm md:px-8">
      <div className="flex items-center gap-3">
        <MobileNavigation />
        <div>
          <h1 className="text-base font-medium md:text-lg">{current?.label}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {session?.role === "admin" ? "Administrator workspace" : "Investor workspace"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{session?.fullName}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{session?.uuid.slice(0, 8)}…</p>
        </div>
        <Badge variant="secondary">{session?.role === "admin" ? "Admin" : "Investor"}</Badge>
      </div>
    </header>
  );
}
