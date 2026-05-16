"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Plus, Search } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskForm } from "@/components/tasks/task-form";
import { CommandPalette } from "@/components/search/command-palette";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [addOpen, setAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-col border-b bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {/* Search trigger */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Search</span>
              <kbd className="hidden sm:inline-flex h-4 select-none items-center rounded border bg-muted px-1 font-mono text-[10px] font-medium">
                ⌘K
              </kbd>
            </Button>

            {/* Theme toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ThemeIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="h-4 w-4" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="h-4 w-4" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="h-4 w-4" /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick add task */}
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0 shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Task</span>
            </Button>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </header>

      <TaskForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={format(new Date(), "yyyy-MM-dd")}
      />

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
