import { cn } from "@/lib/utils";
import { PLATFORM } from "@/lib/constants";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-current" />
      <path
        d="M8 22V10l8 8 8-8v12"
        className="fill-none stroke-[var(--bronze)]"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandWordmark({
  inverted = false,
  compact = false,
}: {
  inverted?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark className={inverted ? "text-white" : "text-primary"} />
      <div className="min-w-0">
        <p
          className={cn(
            "font-heading text-base leading-tight tracking-wide",
            inverted ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          {PLATFORM.name}
        </p>
        {!compact && (
          <p
            className={cn(
              "mt-1 text-[10px] font-medium tracking-[0.18em] uppercase",
              inverted ? "text-sidebar-foreground/55" : "text-muted-foreground",
            )}
          >
            {PLATFORM.tagline}
          </p>
        )}
      </div>
    </div>
  );
}
