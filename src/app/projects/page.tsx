"use client";

import React, { useState } from "react";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PROJECT_COLORS, PROJECT_EMOJIS, cn, generateId } from "@/lib/utils";
import { Plus, Folder, CheckCircle2, Clock, Circle, Trash2, Pencil, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

function ProjectForm({
  open, onClose, editId,
}: {
  open: boolean;
  onClose: () => void;
  editId?: string;
}) {
  const { projects, addProject, updateProject } = useStore();
  const existing = editId ? projects.find((p) => p.id === editId) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [color, setColor] = useState(existing?.color ?? PROJECT_COLORS[0]);
  const [emoji, setEmoji] = useState(existing?.emoji ?? PROJECT_EMOJIS[0]);

  React.useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setDescription(existing?.description ?? "");
      setColor(existing?.color ?? PROJECT_COLORS[0]);
      setEmoji(existing?.emoji ?? PROJECT_EMOJIS[0]);
    }
  }, [open, editId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editId) {
      updateProject(editId, { name: name.trim(), description: description.trim(), color, emoji });
    } else {
      addProject({ name: name.trim(), description: description.trim(), color, emoji });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="px-6 pt-5 pb-0">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="What's this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "text-xl h-9 w-9 flex items-center justify-center rounded-lg border-2 transition-all",
                    emoji === e ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0 shadow-sm"
            >
              {editId ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const { projects, tasks, deleteProject, isLoaded } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();

  if (!isLoaded) {
    return (
      <>
        <Header title="Projects" />
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex justify-end">
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Projects" subtitle={`${projects.length} projects`} />

      <div className="p-4 md:p-6">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed py-20 text-center">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setAddOpen(true)}
            >
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const projectTasks = tasks.filter((t) => t.projectId === project.id);
              const done = projectTasks.filter((t) => t.status === "done").length;
              const inProgress = projectTasks.filter((t) => t.status === "in_progress").length;
              const todo = projectTasks.filter((t) => t.status === "todo").length;
              const pct = projectTasks.length
                ? Math.round((done / projectTasks.length) * 100)
                : 0;

              return (
                <Card
                  key={project.id}
                  className="group hover:shadow-md transition-all hover:border-primary/30 relative overflow-hidden"
                >
                  {/* Color bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: project.color }}
                  />

                  <CardContent className="p-4 pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                          style={{ backgroundColor: project.color + "20" }}
                        >
                          {project.emoji}
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditId(project.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete "${project.name}"? Tasks will be unlinked.`)) {
                              deleteProject(project.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{pct}% complete</span>
                        <span>{done}/{projectTasks.length} tasks</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: project.color }}
                        />
                      </div>
                    </div>

                    {/* Task count badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Circle className="h-3 w-3" /> {todo} todo
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-950 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400">
                        <Clock className="h-3 w-3" /> {inProgress}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> {done}
                      </span>
                    </div>

                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        View Project
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ProjectForm open={addOpen} onClose={() => setAddOpen(false)} />
      <ProjectForm
        open={!!editId}
        onClose={() => setEditId(undefined)}
        editId={editId}
      />
    </>
  );
}
