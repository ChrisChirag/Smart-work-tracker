"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PRIORITY_CONFIG } from "@/lib/utils";
import type { Task, Priority, TaskStatus } from "@/lib/types";
import { Tag, Calendar, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  editTask?: Task;
  defaultDate?: string;
  defaultProjectId?: string;
}

export function TaskForm({ open, onClose, editTask, defaultDate, defaultProjectId }: TaskFormProps) {
  const { projects, tags, addTask, updateTask } = useStore();

  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(editTask?.status ?? "todo");
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? "medium");
  const [projectId, setProjectId] = useState(editTask?.projectId ?? defaultProjectId ?? "");
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? "");
  const [scheduledDate, setScheduledDate] = useState(editTask?.scheduledDate ?? defaultDate ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(editTask?.tagIds ?? []);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      projectId: projectId || undefined,
      tagIds: selectedTagIds,
      dueDate: dueDate || undefined,
      scheduledDate: scheduledDate || undefined,
      completedAt: editTask?.completedAt,
    };

    if (editTask) {
      updateTask(editTask.id, taskData);
    } else {
      addTask(taskData);
    }
    onClose();
  };

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      if (!editTask) {
        setTitle("");
        setDescription("");
        setStatus("todo");
        setPriority("medium");
        setProjectId(defaultProjectId ?? "");
        setDueDate("");
        setScheduledDate(defaultDate ?? "");
        setSelectedTagIds([]);
      }
    }
  }, [open, editTask, defaultDate, defaultProjectId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", PRIORITY_CONFIG[p].dot)} />
                        {PRIORITY_CONFIG[p].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5" />
              Project
            </Label>
            <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span>{p.emoji}</span>
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Schedule
              </Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all",
                      selectedTagIds.includes(tag.id)
                        ? "border-transparent text-white"
                        : "border-border bg-background text-muted-foreground hover:border-primary"
                    )}
                    style={
                      selectedTagIds.includes(tag.id)
                        ? { backgroundColor: tag.color }
                        : {}
                    }
                  >
                    {selectedTagIds.includes(tag.id) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                    )}
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {editTask ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
