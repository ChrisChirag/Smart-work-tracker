"use client";

import React, { useState } from "react";
import { useStore } from "@/store";
import { PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue, cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskForm } from "./task-form";
import {
  MoreHorizontal, Pencil, Trash2, CheckCircle2,
  Circle, Clock, Calendar, Tag, Folder, AlertCircle,
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
}

export function TaskCard({ task, compact }: TaskCardProps) {
  const { projects, tags, toggleTaskStatus, deleteTask } = useStore();
  const [editOpen, setEditOpen] = useState(false);

  const project = projects.find((p) => p.id === task.projectId);
  const taskTags = tags.filter((t) => task.tagIds.includes(t.id));
  const priority = PRIORITY_CONFIG[task.priority];
  const overdue = isOverdue(task.dueDate) && task.status !== "done";

  const StatusIcon = task.status === "done"
    ? CheckCircle2
    : task.status === "in_progress"
    ? Clock
    : Circle;

  return (
    <>
      <div
        className={cn(
          "group relative rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/30",
          task.status === "done" && "opacity-60",
          compact ? "p-3" : "p-4"
        )}
      >
        {/* Priority stripe */}
        <div
          className={cn(
            "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
            priority.dot
          )}
        />

        <div className="pl-3">
          {/* Header row */}
          <div className="flex items-start gap-2">
            <button
              onClick={() => toggleTaskStatus(task.id)}
              className={cn(
                "mt-0.5 shrink-0 transition-transform hover:scale-110",
                task.status === "done"
                  ? "text-emerald-500"
                  : task.status === "in_progress"
                  ? "text-violet-500"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <StatusIcon className="h-5 w-5" />
            </button>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-medium leading-snug",
                  task.status === "done" && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </p>

              {task.description && !compact && (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Meta row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {/* Priority badge */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    priority.bg, priority.color
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />
                  {priority.label}
                </span>

                {/* Project */}
                {project && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </span>
                )}

                {/* Due date */}
                {task.dueDate && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs",
                      overdue
                        ? "text-red-500 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {overdue ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {formatDate(task.dueDate)}
                  </span>
                )}

                {/* Tags */}
                {taskTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleTaskStatus(task.id)}>
                  <CheckCircle2 className="h-4 w-4" />
                  {task.status === "done" ? "Reopen" : "Mark done"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <TaskForm open={editOpen} onClose={() => setEditOpen(false)} editTask={task} />
    </>
  );
}
