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

      {/* Quick stats */}
      <div className="px-3 pb-2">
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

      {/* User account */}
      {user && (
        <div className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg p-2 hover:bg-accent transition-colors text-left">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
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
