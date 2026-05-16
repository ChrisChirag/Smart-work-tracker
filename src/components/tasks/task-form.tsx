"use client";

import React, { useState } from "react";
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
import { Tag, Calendar, Folder, Flag, Clock, Plus, X } from "lucide-react";
import { cn, PROJECT_COLORS, PROJECT_EMOJIS } from "@/lib/utils";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  editTask?: Task;
  defaultDate?: string;
  defaultTime?: string;
  defaultProjectId?: string;
}

export function TaskForm({ open, onClose, editTask, defaultDate, defaultTime, defaultProjectId }: TaskFormProps) {
  const { projects, tags, addTask, updateTask, addProject } = useStore();

  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(editTask?.status ?? "todo");
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? "medium");
  const [projectId, setProjectId] = useState(editTask?.projectId ?? defaultProjectId ?? "");
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? "");
  const [scheduledDate, setScheduledDate] = useState(editTask?.scheduledDate ?? defaultDate ?? "");
  const [scheduledTime, setScheduledTime] = useState(editTask?.scheduledTime ?? defaultTime ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(editTask?.tagIds ?? []);

  // Inline new-project creation
  const [showNewProj, setShowNewProj] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjColor, setNewProjColor] = useState(PROJECT_COLORS[0]);
  const [newProjEmoji, setNewProjEmoji] = useState(PROJECT_EMOJIS[0]);

  const handleCreateProject = () => {
    if (!newProjName.trim()) return;
    const proj = addProject({ name: newProjName.trim(), description: "", color: newProjColor, emoji: newProjEmoji });
    setProjectId(proj.id);
    setShowNewProj(false);
    setNewProjName("");
    setNewProjColor(PROJECT_COLORS[0]);
    setNewProjEmoji(PROJECT_EMOJIS[0]);
  };

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
      scheduledTime: scheduledTime || undefined,
      completedAt: editTask?.completedAt,
    };

    if (editTask) {
      updateTask(editTask.id, taskData);
    } else {
      addTask(taskData);
    }
    onClose();
  };

  React.useEffect(() => {
    if (!open && !editTask) {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setProjectId(defaultProjectId ?? "");
      setDueDate("");
      setScheduledDate(defaultDate ?? "");
      setScheduledTime(defaultTime ?? "");
      setSelectedTagIds([]);
    }
    if (!open) {
      setShowNewProj(false);
      setNewProjName("");
    }
  }, [open, editTask, defaultDate, defaultTime, defaultProjectId]);

  const activePriority = PRIORITY_CONFIG[priority];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

        <div className="px-6 pt-5 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md text-xs", activePriority.bg, activePriority.color)}>
                <Flag className="h-3.5 w-3.5" />
              </span>
              {editTask ? "Edit Task" : "New Task"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="text-base"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="Add details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5" />
                Priority
              </Label>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5" />
              Project
            </Label>
            <Select
              value={showNewProj ? "__new__" : (projectId || "none")}
              onValueChange={(v) => {
                if (v === "__new__") {
                  setShowNewProj(true);
                  setProjectId("");
                } else {
                  setShowNewProj(false);
                  setProjectId(v === "none" ? "" : v);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2"><span>{p.emoji}</span>{p.name}</span>
                  </SelectItem>
                ))}
                <SelectItem value="__new__">
                  <span className="flex items-center gap-2 text-primary font-medium">
                    <Plus className="h-3.5 w-3.5" />
                    Create new project…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Inline new-project form */}
            {showNewProj && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-primary">New Project</p>
                  <button
                    type="button"
                    onClick={() => { setShowNewProj(false); setProjectId(""); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Input
                  placeholder="Project name"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateProject())}
                  autoFocus
                />

                <div className="flex flex-wrap gap-1">
                  {PROJECT_EMOJIS.slice(0, 10).map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewProjEmoji(em)}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-lg text-sm border-2 transition-all",
                        newProjEmoji === em
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:bg-muted"
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewProjColor(c)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-all",
                        newProjColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-sm shrink-0"
                    style={{ backgroundColor: newProjColor + "33" }}
                  >
                    {newProjEmoji}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 h-8 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0"
                    disabled={!newProjName.trim()}
                    onClick={handleCreateProject}
                  >
                    Create &amp; Select
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due Date
              </Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Schedule
              </Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  if (!e.target.value) setScheduledTime("");
                }}
              />
            </div>
          </div>

          {/* Time — shown only when a scheduled date is set */}
          {scheduledDate && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Time
                <span className="text-muted-foreground font-normal text-xs">(optional — places task on calendar)</span>
              </Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          )}

          {tags.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all",
                        selected
                          ? "border-transparent text-white shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                      style={selected ? { backgroundColor: tag.color } : {}}
                    >
                      {selected && <span className="h-1.5 w-1.5 rounded-full bg-white/80" />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={!title.trim()}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0 shadow-sm"
            >
              {editTask ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
