"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/layout/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { MIN_PASSWORD_LENGTH, passwordPolicyError } from "@/lib/password-policy";
import { changePassword, homeForRole } from "@/services/auth.service";

export default function ChangePasswordPage() {
  const { session, updateSession } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const required = Boolean(session?.mustChangePassword);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const problem = passwordPolicyError(newPassword);
    if (problem) return setError(problem);
    if (newPassword !== confirm) return setError("The new passwords do not match.");

    setPending(true);
    try {
      const next = await changePassword({ currentPassword, newPassword });
      updateSession(next);
      toast.success("Password changed. Other devices have been signed out.");
      router.replace(homeForRole(next.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change the password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeading
        title="Change password"
        description={
          required
            ? "Your administrator issued a temporary password. Choose your own to continue."
            : "Choose a new password for signing in."
        }
      />
      <Card className="max-w-md shadow-none">
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="current-password">
                {required ? "Temporary password" : "Current password"}
              </Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                At least {MIN_PASSWORD_LENGTH} characters, with letters and numbers.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
