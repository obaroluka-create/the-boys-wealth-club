"use client";

import { useSyncExternalStore } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SIDEBAR_STORAGE_KEY } from "@/lib/constants";

const SIDEBAR_EVENT = "sidebar-collapsed-change";

function subscribe(onChange: () => void) {
  window.addEventListener(SIDEBAR_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
  } catch {
    // storage unavailable; the preference just won't persist
  }
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => writeCollapsed(!collapsed)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
