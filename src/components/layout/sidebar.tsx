"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import {
  LayoutDashboard, CheckSquare, FolderKanban,
  CalendarDays, Settings, Zap,
} from "lucide-react";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tasks } = useStore();

  const pendingCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 border-r bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Work Tracker</p>
          <p className="text-xs text-muted-foreground">{pendingCount} active tasks</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-medium">Quick Stats</p>
          <div className="mt-2 space-y-1">
            {[
              { label: "Total", value: tasks.length },
              { label: "Done", value: tasks.filter((t) => t.status === "done").length },
              { label: "Pending", value: pendingCount },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs text-muted-foreground">
                <span>{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
