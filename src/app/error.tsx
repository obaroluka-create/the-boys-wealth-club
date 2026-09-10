"use client";

import { ErrorState } from "@/components/states/error-state";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title="Something went wrong."
        description="The workspace could not finish loading this view."
        onRetry={reset}
        className="max-w-md"
      />
    </div>
  );
}
