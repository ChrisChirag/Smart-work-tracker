"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { TAG_COLORS, cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Sun, Moon, Monitor, Plus, Trash2, Tag, Zap, Shield, RefreshCw,
  Download, LogOut, Clock,
} from "lucide-react";
import type { Task, Project } from "@/lib/types";

function exportCSV(tasks: Task[], projects: Project[]) {
  const headers = ["Title", "Description", "Status", "Priority", "Project", "Due Date", "Scheduled Date", "Created"];
  const rows = tasks.map((t) => [
    `"${t.title.replace(/"/g, '""')}"`,
    `"${(t.description ?? "").replace(/"/g, '""')}"`,
    t.status,
    t.priority,
    projects.find((p) => p.id === t.projectId)?.name ?? "",
    t.dueDate ?? "",
    t.scheduledDate ?? "",
    new Date(t.createdAt).toLocaleDateString(),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tasks-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(tasks: Task[], projects: Project[], tags: { id: string; name: string; color: string }[]) {
  const data = JSON.stringify({ tasks, projects, tags }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `work-tracker-${format(new Date(), "yyyy-MM-dd")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const { tasks, projects, tags, addTag, deleteTag, bufferMinutes, setBufferMinutes } = useStore();
  const [tagOpen, setTagOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    addTag({ name: tagName.trim(), color: tagColor });
    setTagName("");
    setTagColor(TAG_COLORS[0]);
    setTagOpen(false);
  };

  const user = session?.user;
  const tagToDelete = tags.find((t) => t.id === deleteTagId);

  return (
    <>
      <Header title="Settings" />

      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        {/* Account */}
        {user && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Your signed-in profile</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg font-semibold shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Theme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Label className="text-sm font-medium mb-3 block">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", icon: Sun, label: "Light" },
                { value: "dark", icon: Moon, label: "Dark" },
                { value: "system", icon: Monitor, label: "System" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all",
                    theme === value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:bg-muted hover:border-border/80"
                  )}
                >
                  <Icon className={cn("h-5 w-5", theme === value ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", theme === value ? "text-primary" : "text-muted-foreground")}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scheduler */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scheduler</CardTitle>
            <CardDescription>Control how tasks are arranged in your day</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-3 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Buffer time between tasks
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {([0, 5, 10, 15] as const).map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setBufferMinutes(mins)}
                    className={cn(
                      "rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                      bufferMinutes === mins
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border hover:bg-muted hover:border-border/80 text-muted-foreground"
                    )}
                  >
                    {mins === 0 ? "None" : `${mins} min`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Gaps inserted between scheduled tasks to allow transitions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tags</CardTitle>
                <CardDescription>Organize tasks with custom labels</CardDescription>
              </div>
              <Button size="sm" onClick={() => setTagOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Tag
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {tags.length === 0 ? (
              <div className="rounded-xl border border-dashed py-8 text-center">
                <Tag className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No tags yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                  Create tags to organize and filter your tasks
                </p>
                <Button size="sm" variant="outline" onClick={() => setTagOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Create first tag
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="group flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      onClick={() => setDeleteTagId(tag.id)}
                      aria-label={`Delete tag ${tag.name}`}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export Data</CardTitle>
            <CardDescription>Download a copy of your tasks and projects</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportCSV(tasks, projects)}
              >
                <Download className="h-4 w-4" />
                Export as CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportJSON(tasks, projects, tags)}
              >
                <Download className="h-4 w-4" />
                Export as JSON
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              CSV exports task data. JSON exports all data including projects and tags.
            </p>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Smart Work Tracker</p>
                <p className="text-xs text-muted-foreground">Version 1.0</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                Your data syncs across all your devices in real time.
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Your tasks and projects are private to your account.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium">Sign out</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign out of your account on this device
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add tag dialog */}
      <Dialog open={tagOpen} onOpenChange={(v) => !v && setTagOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Tag</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTag} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tag name *</Label>
              <Input
                placeholder="e.g. Design, Dev, Review…"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTagColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      tagColor === c ? "border-foreground scale-110 shadow-sm" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Preview</Label>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white shadow-sm"
                style={{ backgroundColor: tagColor }}
              >
                <Tag className="h-3 w-3" />
                {tagName || "Tag name"}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTagOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!tagName.trim()}>
                Create Tag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete tag confirmation */}
      <AlertDialog
        open={!!deleteTagId}
        onOpenChange={(open) => { if (!open) setDeleteTagId(null); }}
        title={`Delete tag "${tagToDelete?.name}"?`}
        description="This will remove the tag from all tasks. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTagId) deleteTag(deleteTagId);
          setDeleteTagId(null);
        }}
      />
    </>
  );
}
