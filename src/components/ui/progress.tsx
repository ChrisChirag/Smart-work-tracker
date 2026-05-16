import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0–100
  className?: string;
  barClassName?: string;
}

export function Progress({ value, className, barClassName }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-white/20", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-white transition-all duration-500",
          barClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
