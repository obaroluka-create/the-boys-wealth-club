"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandWordmark } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/lib/auth/auth-context";
import { PLATFORM } from "@/lib/constants";
import { PageSkeleton } from "@/components/states/page-skeleton";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function LoginPage() {
  const { session, status, homePath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace(homePath);
    }
  }, [homePath, router, session, status]);

  if (status === "loading" || session) {
    return <PageSkeleton />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden flex-col justify-between bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex">
        <BrandWordmark inverted />
        <div className="max-w-md">
          <p className="font-heading text-5xl leading-tight">Disciplined capital. Private access.</p>
          <p className="mt-5 text-sm leading-6 text-sidebar-foreground/70">
            {PLATFORM.name} is a private investment platform. Access is issued by the firm. There is no
            public registration, and every session is intended for authorised investors and
            administrators only.
          </p>
        </div>
        <p className="text-xs tracking-[0.18em] text-sidebar-foreground/45 uppercase">
          {PLATFORM.tagline}
        </p>
      </section>
      <section className="relative flex items-center justify-center px-6 py-12">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandWordmark />
          </div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Secure access
          </p>
          <h1 className="font-heading mt-2 text-4xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the credentials provided by your administrator.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}
