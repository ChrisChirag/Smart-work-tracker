"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import { LayoutDashboard, CheckSquare, CalendarDays, BarChart2, Settings } from "lucide-react";
import { format } from "date-fns";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { tasks } = useStore();

  const today = format(new Date(), "yyyy-MM-dd");
  const overdueCount = tasks.filter(
    (t) => t.dueDate && t.dueDate < today && t.status !== "done"
  ).length;

  if (pathname.startsWith("/auth")) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="flex items-center justify-around px-1 py-1.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 min-w-[3.5rem] min-h-[3.5rem] transition-all touch-manipulation justify-center",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                {href === "/tasks" && overdueCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                    {overdueCount > 9 ? "9+" : overdueCount}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium leading-none", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
