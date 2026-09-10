"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui-blocks/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getPortfolioMetrics } from "@/lib/portfolio-metrics";
import type { UserAccountRow } from "@/types";

export function UserDetailSheet({
  row,
  onOpenChange,
}: {
  row: UserAccountRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const metrics = row?.portfolio ? getPortfolioMetrics(row.portfolio) : null;

  return (
    <Sheet open={Boolean(row)} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {row ? (
          <>
            <SheetHeader>
              <SheetTitle>{row.user.fullName}</SheetTitle>
              <SheetDescription>Investor management panel</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4 text-sm">
              <Field label="UUIDv4" value={row.user.id} mono />
              <Field label="Email" value={row.user.email} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge status={row.user.status} />
                </div>
              </div>
              <Field label="Member since" value={formatDate(row.user.memberSince)} />
              {row.portfolio && metrics ? (
                <>
                  <Field
                    label="Total deposit"
                    value={formatCurrency(row.portfolio.totalDeposit, true)}
                  />
                  <Field
                    label="Current balance"
                    value={formatCurrency(row.portfolio.currentBalance, true)}
                  />
                  <Field label="Net profit / loss" value={formatCurrency(metrics.net, true)} />
                </>
              ) : null}
              <div className="flex flex-col gap-2 pt-2">
                <Button asChild>
                  <Link href={`/admin/users/${row.user.id}`}>Edit profile</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/admin/investments/${row.user.id}`}>Open investment record</Link>
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "mt-1 font-mono text-xs break-all" : "mt-1"}>{value}</p>
    </div>
  );
}
