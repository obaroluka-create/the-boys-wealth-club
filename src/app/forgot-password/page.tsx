"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BrandWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORM } from "@/lib/constants";
import { requestPasswordReset } from "@/services/auth.service";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast.success("If an account exists, a reset instruction will be issued by operations.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit the request.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <BrandWordmark />
        <h1 className="font-heading mt-8 text-4xl">Reset access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Password resets are handled by the firm. Submit the email on your account and an
          administrator will follow up.
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11"
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={sent || pending}>
            {sent ? "Request received" : pending ? "Submitting…" : "Submit request"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Contact {PLATFORM.supportEmail} if you need immediate assistance.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm hover:underline">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
