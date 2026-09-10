"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { homeForRole } from "@/services/auth.service";
import { DEMO_PASSWORD } from "@/lib/constants";

export function LoginForm() {
  const { login, demoLogin } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [pending, setPending] = useState<"form" | "user" | "admin" | null>(null);

  function validate() {
    const next: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) next.identifier = "Enter your email or username.";
    if (!password) next.password = "Enter your password.";
    else if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setPending("form");
    try {
      const session = await login({ identifier, password, rememberMe });
      router.replace(homeForRole(session.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setPending(null);
    }
  }

  async function onDemo(role: "admin" | "user") {
    setError(null);
    setPending(role);
    try {
      const session = await demoLogin(role);
      router.replace(homeForRole(session.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign-in failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or username</Label>
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            aria-invalid={Boolean(fieldErrors.identifier)}
            className="h-11"
            placeholder="name@meridian.private"
            disabled={pending !== null}
          />
          {fieldErrors.identifier ? (
            <p className="text-xs text-destructive">{fieldErrors.identifier}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              className="h-11 pr-10"
              disabled={pending !== null}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1.5 right-1.5"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {fieldErrors.password ? (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(value) => setRememberMe(value === true)}
              disabled={pending !== null}
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
            Forgot password
          </Link>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={pending !== null}>
          {pending === "form" ? <Loader2 className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 font-mono text-[11px] text-neutral-600">
        <p className="font-sans text-[10px] font-semibold tracking-[0.16em] text-neutral-500 uppercase">
          Development preview — not production UI
        </p>
        <p className="mt-2 font-sans text-xs leading-relaxed text-neutral-500">
          Use these shortcuts to inspect role experiences. Demo password: {DEMO_PASSWORD}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 font-sans"
            disabled={pending !== null}
            onClick={() => onDemo("user")}
          >
            {pending === "user" ? <Loader2 className="animate-spin" /> : null}
            Continue as investor
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 font-sans"
            disabled={pending !== null}
            onClick={() => onDemo("admin")}
          >
            {pending === "admin" ? <Loader2 className="animate-spin" /> : null}
            Continue as administrator
          </Button>
        </div>
      </div>
    </div>
  );
}
