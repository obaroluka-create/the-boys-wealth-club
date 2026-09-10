"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/states/empty-state";
import { StatusBadge } from "@/components/ui-blocks/status-badge";
import { ChangeIndicator } from "@/components/dashboard/change-indicator";
import { formatCurrency, shortUuid } from "@/lib/format";
import { setUserStatus } from "@/services/users.service";
import type { AccountStatus, User, UserAccountRow, UserQuery } from "@/types";
import { UserDetailSheet } from "@/components/admin/user-detail-sheet";

export function UserManagement({
  rows,
  total,
  query,
  onQueryChange,
}: {
  rows: UserAccountRow[];
  total: number;
  query: Required<Pick<UserQuery, "search" | "status" | "sortBy" | "sortDir" | "page" | "pageSize">>;
  onQueryChange: (query: Partial<UserQuery>) => void;
}) {
  const [selected, setSelected] = useState<UserAccountRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ user: User; status: AccountStatus } | null>(null);
  const [pending, setPending] = useState(false);
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));

  async function applyStatus() {
    if (!statusTarget) return;
    setPending(true);
    try {
      await setUserStatus(statusTarget.user.id, statusTarget.status);
      toast.success(statusTarget.status === "disabled" ? "User disabled." : "User activated.");
      setStatusTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update status.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Input
          placeholder="Search name, email, or UUID"
          value={query.search}
          onChange={(event) => onQueryChange({ search: event.target.value, page: 1 })}
          className="h-10 md:col-span-2"
        />
        <Select
          value={query.status}
          onValueChange={(value) => onQueryChange({ status: value as UserQuery["status"], page: 1 })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={`${query.sortBy}:${query.sortDir}`}
          onValueChange={(value) => {
            const [sortBy, sortDir] = value.split(":") as [UserQuery["sortBy"], UserQuery["sortDir"]];
            onQueryChange({ sortBy, sortDir, page: 1 });
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name:asc">Name A–Z</SelectItem>
            <SelectItem value="name:desc">Name Z–A</SelectItem>
            <SelectItem value="investment:desc">Total deposit high–low</SelectItem>
            <SelectItem value="balance:desc">Balance high–low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No users found." description="Adjust search or filters and try again." />
      ) : (
        <>
          <div className="hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>UUID</TableHead>
                  <TableHead className="text-right">Total deposit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.user.id}>
                    <TableCell>
                      <p className="font-medium">{row.user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{row.user.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{shortUuid(row.user.id)}</TableCell>
                    <TableCell className="financial text-right">
                      {row.portfolio ? formatCurrency(row.portfolio.totalDeposit) : "—"}
                    </TableCell>
                    <TableCell className="financial text-right">
                      {row.portfolio ? formatCurrency(row.portfolio.currentBalance) : "—"}
                    </TableCell>
                    <TableCell>
                      <ChangeIndicator value={row.performancePercentage} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.user.status} />
                    </TableCell>
                    <TableCell>
                      <RowActions
                        user={row.user}
                        onView={() => setSelected(row)}
                        onStatus={(status) => setStatusTarget({ user: row.user, status })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <article key={row.user.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.user.fullName}</p>
                    <p className="font-mono text-[11px] break-all text-muted-foreground">{row.user.id}</p>
                  </div>
                  <StatusBadge status={row.user.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Total deposit</dt>
                    <dd className="financial">
                      {row.portfolio ? formatCurrency(row.portfolio.totalDeposit) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Balance</dt>
                    <dd className="financial">
                      {row.portfolio ? formatCurrency(row.portfolio.currentBalance) : "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between">
                  <ChangeIndicator value={row.performancePercentage} />
                  <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
                    View
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              {total} investor{total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.page <= 1}
                onClick={() => onQueryChange({ page: query.page - 1 })}
              >
                Previous
              </Button>
              <span className="px-2 py-1 text-muted-foreground">
                {query.page} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={query.page >= pageCount}
                onClick={() => onQueryChange({ page: query.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <UserDetailSheet row={selected} onOpenChange={(open) => !open && setSelected(null)} />

      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.status === "disabled" ? "Disable user" : "Activate user"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This updates mock account status only. The backend will later persist the change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyStatus} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  user,
  onView,
  onStatus,
}: {
  user: User;
  onView: () => void;
  onStatus: (status: AccountStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.fullName}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>View user</DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/users/${user.id}`}>Edit user</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/investments/${user.id}`}>Manage investment</Link>
        </DropdownMenuItem>
        {user.status === "disabled" ? (
          <DropdownMenuItem onClick={() => onStatus("active")}>Activate user</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onStatus("disabled")}>Disable user</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
