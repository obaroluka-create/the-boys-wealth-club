"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@/hooks/use-query";
import { getUser, updateUser } from "@/services/users.service";
import type { AccountStatus } from "@/types";

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const query = useQuery(() => getUser(params.id), [params.id]);
  const [pending, setPending] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<AccountStatus>("active");
  const [hydrated, setHydrated] = useState(false);

  if (query.status === "success" && !hydrated) {
    setFullName(query.data.fullName);
    setEmail(query.data.email);
    setStatus(query.data.status);
    setHydrated(true);
  }

  if (query.status === "error") {
    return <ErrorState title="Unable to load this user." onRetry={query.refetch} />;
  }
  if (query.status === "loading" || !hydrated) return <PageSkeleton />;

  const user = query.data;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await updateUser(user.id, { fullName, email, status });
      toast.success("User updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeading title="Edit user" description="Profile fields only. Capital is managed separately." />
      <Card className="max-w-xl shadow-none">
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="uuid">UUIDv4</Label>
              <Input id="uuid" value={user.id} readOnly className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Account status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AccountStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
