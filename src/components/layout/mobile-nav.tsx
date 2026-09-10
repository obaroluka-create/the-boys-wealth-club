"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { BrandWordmark } from "@/components/brand/logo";
import { ADMIN_NAV, USER_NAV } from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  const items = session?.role === "admin" ? ADMIN_NAV : USER_NAV;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground sm:max-w-xs">
        <SheetHeader>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <BrandWordmark inverted />
        </SheetHeader>
        <nav className="mt-6 grid gap-1" aria-label="Mobile">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="ghost"
          className="mt-6 justify-start text-sidebar-foreground"
          onClick={async () => {
            setOpen(false);
            await logout();
            router.replace("/login");
          }}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </SheetContent>
    </Sheet>
  );
}
