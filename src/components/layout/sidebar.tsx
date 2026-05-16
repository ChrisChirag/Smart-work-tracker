"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import {
  LayoutDashboard, CheckSquare, FolderKanban,
  CalendarDays, Settings, Zap, LogOut,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { tasks } = useStore();

  const pendingCount = tasks.filter((t) => t.status !== "done").length;
  const user = session?.user;

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 border-r bg-card overflow-hidden">
      {/* Gradient accent line at top */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500 shrink-0" />

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Work Tracker</p>
          <p className="text-xs text-muted-foreground">{pendingCount} active tasks</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {/* Active left indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary-foreground/60" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Quick stats — styled as a mini card with subtle gradient */}
      <div className="px-3 pb-2">
        <div className="rounded-xl bg-gradient-to-br from-muted/80 to-muted p-3 border border-border/50">
          <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-2">Quick Stats</p>
          <div className="space-y-1.5">
            {[
              { label: "Total", value: tasks.length },
              { label: "Done", value: tasks.filter((t) => t.status === "done").length },
              { label: "Pending", value: pendingCount },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User account */}
      {user && (
        <div className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl p-2.5 hover:bg-accent transition-all hover:shadow-sm text-left group">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all shrink-0"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-sm font-semibold shrink-0 shadow-sm">
                    {user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive gap-2"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  );
}
