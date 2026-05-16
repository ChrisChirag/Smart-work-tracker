"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PRIORITY_CONFIG } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/lib/types";
import { Search, Plus, Filter, SortAsc, X } from "lucide-react";

type SortKey = "createdAt" | "dueDate" | "priority" | "title" | "completedLast";
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

interface ActiveFiltersProps {
  search: string;
  filterPriority: string;
  filterProject: string;
  filterTag: string;
  projects: { id: string; name: string; emoji: string }[];
  tags: { id: string; name: string }[];
  onClearSearch: () => void;
  onClearPriority: () => void;
  onClearProject: () => void;
  onClearTag: () => void;
  onClearAll: () => void;
}

function ActiveFilters({
  search, filterPriority, filterProject, filterTag,
  projects, tags,
  onClearSearch, onClearPriority, onClearProject, onClearTag, onClearAll,
}: ActiveFiltersProps) {
  const hasAny =
    search ||
    filterPriority !== "all" ||
    filterProject !== "all" ||
    filterTag !== "all";

  if (!hasAny) return null;

  const projectLabel = filterProject === "none"
    ? "No project"
    : projects.find((p) => p.id === filterProject)
      ? `${projects.find((p) => p.id === filterProject)!.emoji} ${projects.find((p) => p.id === filterProject)!.name}`
      : null;

  const tagLabel = tags.find((t) => t.id === filterTag)?.name;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Filters:</span>

      {search && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
          Search: &quot;{search}&quot;
          <button onClick={onClearSearch} aria-label="Clear search filter" className="hover:text-primary/70 ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {filterPriority !== "all" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
          {PRIORITY_CONFIG[filterPriority as Priority].label}
          <button onClick={onClearPriority} aria-label="Clear priority filter" className="hover:text-primary/70 ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {filterProject !== "all" && projectLabel && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
          {projectLabel}
          <button onClick={onClearProject} aria-label="Clear project filter" className="hover:text-primary/70 ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {filterTag !== "all" && tagLabel && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
          {tagLabel}
          <button onClick={onClearTag} aria-label="Clear tag filter" className="hover:text-primary/70 ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Clear all
      </button>
    </div>
  );
}

export default function TasksPage() {
  const { tasks, projects, tags, isLoaded } = useStore();
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskStatus | "all">("all");

  const hasFilters = !!(
    search ||
    filterPriority !== "all" ||
    filterProject !== "all" ||
    filterTag !== "all"
  );

  const clearAllFilters = () => {
    setSearch("");
    setFilterPriority("all");
    setFilterProject("all");
    setFilterTag("all");
  };

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (activeTab !== "all" && t.status !== activeTab) return false;
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterPriority !== "all" && t.priority !== filterPriority) return false;
        if (filterProject === "none" && t.projectId) return false;
        if (filterProject !== "all" && filterProject !== "none" && t.projectId !== filterProject) return false;
        if (filterTag !== "all" && !t.tagIds.includes(filterTag)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "completedLast") {
          const aDone = a.status === "done" ? 1 : 0;
          const bDone = b.status === "done" ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (sortBy === "dueDate") {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks, search, filterPriority, filterProject, filterTag, sortBy, activeTab]);

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  if (!isLoaded) {
    return (
      <>
        <Header title="Tasks" />
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Tasks" subtitle={`${tasks.length} total tasks`} />

      <div className="p-4 md:p-6 space-y-4">
        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => (
                <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
              <SortAsc className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Newest first</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="dueDate">Due date</SelectItem>
              <SelectItem value="title">A–Z</SelectItem>
              <SelectItem value="completedLast">Completed last</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filter chips */}
        <ActiveFilters
          search={search}
          filterPriority={filterPriority}
          filterProject={filterProject}
          filterTag={filterTag}
          projects={projects}
          tags={tags}
          onClearSearch={() => setSearch("")}
          onClearPriority={() => setFilterPriority("all")}
          onClearProject={() => setFilterProject("all")}
          onClearTag={() => setFilterTag("all")}
          onClearAll={clearAllFilters}
        />

        {/* Status tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="todo">To Do ({counts.todo})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({counts.in_progress})</TabsTrigger>
            <TabsTrigger value="done">Done ({counts.done})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed py-16 text-center">
                {hasFilters ? (
                  <>
                    <p className="text-sm text-muted-foreground">No tasks match your filters</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={clearAllFilters}
                    >
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">No tasks found</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add a task
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TaskForm open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
