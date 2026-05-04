"use client";

import { cn } from "@/lib/utils";

export type LinearLoadProgressProps = {
  /** 0–100; không dùng khi `indeterminate` */
  value?: number;
  indeterminate?: boolean;
  variant?: "thin" | "medium";
  className?: string;
};

/** Thanh nền + fill (hoặc pulse khi không xác định tiến độ). */
export function LinearLoadProgress({
  value = 0,
  indeterminate = false,
  variant = "medium",
  className,
}: LinearLoadProgressProps) {
  const trackH = variant === "thin" ? "h-0.5 sm:h-1" : "h-1.5 sm:h-2";

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        trackH,
        className,
      )}
    >
      {indeterminate ? (
        <div
          className="h-full w-2/3 animate-pulse rounded-full bg-linear-to-r from-primary/25 via-primary/55 to-primary/25"
          aria-hidden
        />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{
            width: `${Math.min(100, Math.max(2, value))}%`,
          }}
        />
      )}
    </div>
  );
}

export type LoadProgressRowProps = {
  label?: string;
  value?: number;
  indeterminate?: boolean;
  showPercent?: boolean;
  /** `compact`: chữ và thanh mỏng (footer / toolbar). */
  density?: "compact" | "comfortable";
  className?: string;
};

/** Một hàng: nhãn | thanh | % (hoặc …). */
export function LoadProgressRow({
  label,
  value = 0,
  indeterminate = false,
  showPercent = false,
  density = "comfortable",
  className,
}: LoadProgressRowProps) {
  const compact = density === "compact";
  const showTrailing = showPercent || indeterminate;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {label ? (
        <span
          className={cn(
            "shrink-0 leading-none text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {label}
        </span>
      ) : null}
      <LinearLoadProgress
        indeterminate={indeterminate}
        value={indeterminate ? undefined : value}
        variant={compact ? "thin" : "medium"}
        className="min-w-0 flex-1"
      />
      {showTrailing ? (
        <span
          className={cn(
            "shrink-0 tabular-nums font-medium leading-none text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {indeterminate || value <= 0 ? "…" : `${Math.round(value)}%`}
        </span>
      ) : null}
    </div>
  );
}

export type FixedBottomLoadProgressProps = Omit<
  LoadProgressRowProps,
  "className"
> & {
  show: boolean;
  /** Khung chứa hàng progress (căn giữa). */
  innerClassName?: string;
};

/** Thanh progress mỏng cố định đáy viewport (an toàn khu vực notch). */
export function FixedBottomLoadProgress({
  show,
  innerClassName,
  ...row
}: FixedBottomLoadProgressProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-0 bottom-0 left-0 z-40",
        "border-t border-border/50 bg-background/90 px-3 py-1.5 backdrop-blur-sm",
        "pb-[max(0.375rem,env(safe-area-inset-bottom))] md:px-5",
      )}
      aria-hidden
    >
      <div
        className={cn("mx-auto flex w-full max-w-4xl items-center", innerClassName)}
      >
        <LoadProgressRow {...row} density="compact" className="w-full" />
      </div>
    </div>
  );
}
