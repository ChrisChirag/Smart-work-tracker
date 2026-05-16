"use client";

import React, { useState } from "react";
import { useStore } from "@/store";
import { PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue, cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { TaskForm } from "./task-form";
import {
  MoreHorizontal, Pencil, Trash2, CheckCircle2,
  Circle, Clock, Calendar, AlertCircle,
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
}

export function TaskCard({ task, compact }: TaskCardProps) {
  const { projects, tags, setTaskStatus, deleteTask } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const project = projects.find((p) => p.id === task.projectId);
  const taskTags = tags.filter((t) => task.tagIds.includes(t.id));
  const priority = PRIORITY_CONFIG[task.priority];
  const status = STATUS_CONFIG[task.status];
  const overdue = isOverdue(task.dueDate) && task.status !== "done";

  const StatusIcon = task.status === "done"
    ? CheckCircle2
    : task.status === "in_progress"
    ? Clock
    : Circle;

  const handleStatusIconClick = () => {
    if (task.status === "done") {
      setTaskStatus(task.id, "todo");
    } else {
      setTaskStatus(task.id, "done");
    }
  };

  const displayTags = compact ? taskTags.slice(0, 1) : taskTags;
  const extraTagCount = compact ? taskTags.length - 1 : 0;

  return (
    <>
      <div
        className={cn(
          "group relative rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-px",
          task.status === "done" && "opacity-60",
          overdue && "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10",
          compact ? "p-3" : "p-4"
        )}
      >
        {/* Priority stripe — uses exact priority hex color */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl rounded-r-none"
          style={{ backgroundColor: priority.hex }}
        />

        <div className="pl-4">
          {/* Header row */}
          <div className="flex items-start gap-2">
            <button
              onClick={handleStatusIconClick}
              aria-label={task.status === "done" ? "Mark as to do" : "Mark as done"}
              className={cn(
                "mt-0.5 shrink-0 transition-transform hover:scale-110",
                task.status === "done"
                  ? "text-emerald-500"
                  : task.status === "in_progress"
                  ? "text-violet-500"
                  : "text-muted-foreground hover:text-emerald-500"
              )}
            >
              <StatusIcon className="h-5 w-5" />
            </button>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-medium leading-snug",
                  task.status === "done" && "line-through text-muted-foreground/60"
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

                {/* Status badge — show for non-todo statuses */}
                {task.status !== "todo" && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      status.bg, status.color
                    )}
                  >
                    {status.label}
                  </span>
                )}

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

                {/* Scheduled time */}
                {task.scheduledTime && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {task.scheduledTime}
                  </span>
                )}

                {/* Due date + overdue badge */}
                {task.dueDate && (
                  overdue ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500 text-white px-2 py-0.5 text-xs font-semibold">
                      <AlertCircle className="h-3 w-3" />
                      Overdue · {formatDate(task.dueDate)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )
                )}

                {/* Tags */}
                {displayTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
                {compact && extraTagCount > 0 && (
                  <span className="text-xs text-muted-foreground">+{extraTagCount}</span>
                )}
              </div>
            </div>

            {/* Actions — always slightly visible on mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-30 group-hover:opacity-100 transition-opacity touch-manipulation"
                  aria-label="Task actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {task.status !== "todo" && (
                  <DropdownMenuItem onClick={() => setTaskStatus(task.id, "todo")}>
                    <Circle className="h-4 w-4" />
                    Mark To Do
                  </DropdownMenuItem>
                )}
                {task.status !== "in_progress" && (
                  <DropdownMenuItem onClick={() => setTaskStatus(task.id, "in_progress")}>
                    <Clock className="h-4 w-4 text-violet-500" />
                    Mark In Progress
                  </DropdownMenuItem>
                )}
                {task.status !== "done" && (
                  <DropdownMenuItem onClick={() => setTaskStatus(task.id, "done")}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Mark Done
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
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

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task?"
        description={`"${task.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTask(task.id)}
      />
    </>
  );
}
