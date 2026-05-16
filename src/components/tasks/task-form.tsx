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
import { Tag, Folder, Flag, Plus, X, Trash2, Zap } from "lucide-react";
import { cn, PROJECT_COLORS } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { DurationPicker } from "@/components/ui/duration-picker";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  editTask?: Task;
  defaultDate?: string;
  defaultTime?: string;
  defaultProjectId?: string;
}

export function TaskForm({ open, onClose, editTask, defaultDate, defaultTime, defaultProjectId }: TaskFormProps) {
  const { tasks, projects, tags, addTask, updateTask, deleteTask, addProject } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(editTask?.status ?? "todo");
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? "medium");
  const [projectId, setProjectId] = useState(editTask?.projectId ?? defaultProjectId ?? "");
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? "");
  const [scheduledDate, setScheduledDate] = useState(editTask?.scheduledDate ?? defaultDate ?? "");
  const [scheduledTime, setScheduledTime] = useState(editTask?.scheduledTime ?? defaultTime ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(editTask?.tagIds ?? []);
  const [pinnedTime, setPinnedTime] = useState(editTask?.pinnedTime ?? false);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(editTask?.estimatedMinutes);

  // Inline new-project creation
  const [showNewProj, setShowNewProj] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjColor, setNewProjColor] = useState(PROJECT_COLORS[0]);

  const handleCreateProject = () => {
    if (!newProjName.trim()) return;
    const proj = addProject({ name: newProjName.trim(), description: "", color: newProjColor });
    setProjectId(proj.id);
    setShowNewProj(false);
    setNewProjName("");
    setNewProjColor(PROJECT_COLORS[0]);
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
      // Pass what the user explicitly chose; the store handles auto-scheduling
      scheduledDate: scheduledDate || undefined,
      scheduledTime: scheduledTime || undefined,
      pinnedTime: !!scheduledTime && pinnedTime,
      estimatedMinutes: estimatedMinutes,
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
    if (!open) {
      setShowNewProj(false);
      setNewProjName("");
      setConfirmDelete(false);
      return;
    }
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description ?? "");
      setStatus(editTask.status);
      setPriority(editTask.priority);
      setProjectId(editTask.projectId ?? "");
      setDueDate(editTask.dueDate ?? "");
      setScheduledDate(editTask.scheduledDate ?? "");
      setScheduledTime(editTask.scheduledTime ?? "");
      setSelectedTagIds(editTask.tagIds ?? []);
      setPinnedTime(editTask.pinnedTime ?? false);
      setEstimatedMinutes(editTask.estimatedMinutes);
      setShowNewProj(false);
      setNewProjName("");
    } else {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setProjectId(defaultProjectId ?? "");
      setDueDate("");
      setScheduledDate(defaultDate ?? "");
      setScheduledTime(defaultTime ?? "");
      setSelectedTagIds([]);
      setPinnedTime(!!defaultTime);
      setEstimatedMinutes(undefined);
      setShowNewProj(false);
      setNewProjName("");
    }
  }, [open, editTask?.id, defaultDate, defaultTime, defaultProjectId]);

  const activePriority = PRIORITY_CONFIG[priority];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0">
        <div className="sticky top-0 z-10 h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-2xl sm:rounded-t-2xl" />

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
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
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
              <Label>Due Date</Label>
              <DatePicker value={dueDate} onChange={setDueDate} placeholder="No due date" />
            </div>
            <div className="space-y-1.5">
              <Label>Schedule</Label>
              <DatePicker
                value={scheduledDate}
                onChange={(v) => {
                  setScheduledDate(v);
                  if (!v) setScheduledTime("");
                }}
                placeholder="Not scheduled"
              />
            </div>
          </div>

          {/* Time + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Time <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <TimePicker
                value={scheduledTime}
                onChange={(v) => { setScheduledTime(v); setPinnedTime(!!v); }}
                placeholder="Auto-assigned"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} />
            </div>
          </div>

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

          {/* Auto-schedule hint — only for new tasks */}
          {!editTask && !scheduledTime && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>
                Time will be <strong>auto-assigned</strong> based on priority —{" "}
                {scheduledDate ? "the day's tasks will rebalance automatically" : "defaults to today"}
              </span>
            </div>
          )}

          <DialogFooter className="pt-2">
            {editTask && !confirmDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mr-auto gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
            {confirmDelete && (
              <div className="mr-auto flex items-center gap-2">
                <span className="text-xs text-destructive font-medium">Delete this task?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => { deleteTask(editTask!.id); onClose(); }}
                >
                  Yes, delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
            {!confirmDelete && (
              <>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={!title.trim()}
                  className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0 shadow-sm"
                >
                  {editTask ? "Save Changes" : "Add Task"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
