"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { PRIORITY_CONFIG } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { TaskForm } from "@/components/tasks/task-form";
import {
  Search, CheckSquare, FolderKanban, Tag, Calendar, AlertCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { format } from "date-fns";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { tasks, projects, tags } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editTask, setEditTask] = useState<Task | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  type ResultItem =
    | { type: "task"; item: Task }
    | { type: "project"; item: { id: string; name: string; color: string } }
    | { type: "tag"; item: { id: string; name: string; color: string } };

  const results = useMemo((): ResultItem[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matchedTasks: ResultItem[] = tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map((t) => ({ type: "task", item: t }));

    const matchedProjects: ResultItem[] = projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((p) => ({ type: "project", item: p }));

    const matchedTags: ResultItem[] = tags
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((t) => ({ type: "tag", item: t }));

    return [...matchedTasks, ...matchedProjects, ...matchedTags];
  }, [query, tasks, projects, tags]);

  useEffect(() => { setSelectedIdx(0); }, [results.length]);

  const handleSelect = (result: ResultItem) => {
    if (result.type === "task") {
      setEditTask(result.item);
      setEditOpen(true);
      onClose();
    } else if (result.type === "project") {
      router.push(`/projects/${result.item.id}`);
      onClose();
    } else {
      router.push("/tasks");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden top-[20%] translate-y-0">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, projects, tags…"
              className="border-0 p-0 text-base shadow-none focus-visible:ring-0 h-auto"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {query && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </div>
            )}

            {!query && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Type to search tasks, projects, and tags
              </div>
            )}

            {results.map((result, idx) => {
              const isSelected = idx === selectedIdx;

              if (result.type === "task") {
                const task = result.item;
                const priority = PRIORITY_CONFIG[task.priority];
                const proj = projects.find((p) => p.id === task.projectId);
                const overdue = task.dueDate && task.dueDate < today && task.status !== "done";

                return (
                  <button
                    key={`task-${task.id}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isSelected ? "bg-accent" : "hover:bg-accent/50"
                    )}
                    onClick={() => handleSelect(result)}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: priority.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", task.status === "done" && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {proj && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                            {proj.name}
                          </span>
                        )}
                        {task.scheduledDate && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {task.scheduledDate === today ? "Today" : formatDate(task.scheduledDate)}
                          </span>
                        )}
                        {overdue && (
                          <span className="text-[11px] text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-2.5 w-2.5" />
                            Overdue
                          </span>
                        )}
                        {task.scheduledTime && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {task.scheduledTime}
                          </span>
                        )}
                      </div>
                    </div>
                    <CheckSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  </button>
                );
              }

              if (result.type === "project") {
                return (
                  <button
                    key={`proj-${result.item.id}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isSelected ? "bg-accent" : "hover:bg-accent/50"
                    )}
                    onClick={() => handleSelect(result)}
                  >
                    <div
                      className="h-5 w-5 rounded-md shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: result.item.color + "25" }}
                    >
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: result.item.color }} />
                    </div>
                    <span className="text-sm font-medium flex-1">{result.item.name}</span>
                    <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  </button>
                );
              }

              return (
                <button
                  key={`tag-${result.item.id}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    isSelected ? "bg-accent" : "hover:bg-accent/50"
                  )}
                  onClick={() => handleSelect(result)}
                >
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: result.item.color }}
                  />
                  <span className="text-sm font-medium flex-1">{result.item.name}</span>
                  <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                </button>
              );
            })}
          </div>

          {results.length > 0 && (
            <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↵</kbd> open
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editTask && (
        <TaskForm
          open={editOpen}
          onClose={() => { setEditOpen(false); setEditTask(undefined); }}
          editTask={editTask}
        />
      )}
    </>
  );
}
