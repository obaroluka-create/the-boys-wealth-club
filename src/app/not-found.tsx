import Link from "next/link";
import { BrandWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <BrandWordmark />
      <h1 className="font-heading mt-8 text-4xl">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The requested workspace page does not exist or is no longer available.
      </p>
      <Button asChild className="mt-6">
        <Link href="/login">Return to sign in</Link>
      </Button>
    </div>
  );
}
