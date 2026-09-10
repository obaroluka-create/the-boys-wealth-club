"use client";

import { useState } from "react";
import { PageHeading } from "@/components/layout/page-heading";
import { UserManagement } from "@/components/admin/user-management";
import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/hooks/use-query";
import { listUsers } from "@/services/users.service";
import type { UserQuery } from "@/types";

export default function AdminUsersPage() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<
    Required<Pick<UserQuery, "search" | "status" | "sortBy" | "sortDir" | "page" | "pageSize">>
  >({
    search: "",
    status: "all",
    sortBy: "name",
    sortDir: "asc",
    page: 1,
    pageSize: 8,
  });
  const result = useQuery(() => listUsers(query), [query]);

  return (
    <div>
      <PageHeading
        title="Users"
        description="View, issue, and administer investor accounts."
        actions={<Button onClick={() => setOpen(true)}>Add user</Button>}
      />
      {result.status === "loading" ? (
        <PageSkeleton />
      ) : result.status === "error" ? (
        <ErrorState title="Unable to load users." onRetry={result.refetch} />
      ) : (
        <UserManagement
          rows={result.data.items}
          total={result.data.total}
          query={query}
          onQueryChange={(next) => setQuery((current) => ({ ...current, ...next }))}
        />
      )}
      <AddUserDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
