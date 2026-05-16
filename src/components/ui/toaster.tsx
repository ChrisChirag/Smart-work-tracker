"use client";
import { useToastStore } from "@/store/toast";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastType } from "@/store/toast";

const TYPE_CONFIG: Record<
  ToastType,
  { icon: React.ElementType; border: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    border: "border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: XCircle,
    border: "border-red-200 dark:border-red-800",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    border: "border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-500",
  },
};

export function Toaster() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const config = TYPE_CONFIG[t.type];
        const Icon = config.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border bg-card shadow-lg px-4 py-3 text-sm",
              "animate-in slide-in-from-right-5 fade-in duration-200",
              config.border
            )}
            style={{ minWidth: 260, maxWidth: 380 }}
          >
            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconColor)} />
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors -mt-0.5 -mr-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
