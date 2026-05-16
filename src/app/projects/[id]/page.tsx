"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, ArrowLeft, CheckCircle2, Clock, Circle,
  Calendar, Activity, ListTodo,
} from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { projects, tasks } = useStore();
  const [addOpen, setAddOpen] = useState(false);

  const project = projects.find((p) => p.id === id);
  const projectTasks = tasks.filter((t) => t.projectId === id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <ListTodo className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => router.push("/projects")} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const done = projectTasks.filter((t) => t.status === "done");
  const inProgress = projectTasks.filter((t) => t.status === "in_progress");
  const todo = projectTasks.filter((t) => t.status === "todo");
  const pct = projectTasks.length ? Math.round((done.length / projectTasks.length) * 100) : 0;

  const completedByDate = done.reduce<Record<string, typeof done>>((acc, t) => {
    const date = t.completedAt
      ? format(parseISO(t.completedAt), "yyyy-MM-dd")
      : t.updatedAt
      ? format(parseISO(t.updatedAt), "yyyy-MM-dd")
      : "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(completedByDate).sort((a, b) => b.localeCompare(a));

  const STATS = [
    {
      label: "Total", value: projectTasks.length, icon: ListTodo,
      iconClass: "bg-primary/10 text-primary", border: "border-l-primary",
    },
    {
      label: "To Do", value: todo.length, icon: Circle,
      iconClass: "bg-muted text-muted-foreground", border: "border-l-muted-foreground/40",
    },
    {
      label: "In Progress", value: inProgress.length, icon: Clock,
      iconClass: "bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400",
      border: "border-l-violet-500",
    },
    {
      label: "Done", value: done.length, icon: CheckCircle2,
      iconClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400",
      border: "border-l-emerald-500",
    },
  ];

  return (
    <>
      <Header
        title={project.name}
        subtitle={project.description}
      />

      <div className="p-4 md:p-6 space-y-5">
        {/* Back + Add */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/projects")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            All Projects
          </Button>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map(({ label, value, icon: Icon, iconClass, border }) => (
            <Card key={label} className={cn("border-l-4 overflow-hidden", border)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-0.5">{value}</p>
                  </div>
                  <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", iconClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex justify-between text-sm mb-3">
            <span className="font-medium">Overall progress</span>
            <span className="text-muted-foreground font-semibold">{pct}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: project.color }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {done.length} of {projectTasks.length} tasks completed
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="history">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Board view */}
          <TabsContent value="board">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              {[
                {
                  label: "To Do", tasks: todo, icon: Circle,
                  headerClass: "text-muted-foreground",
                  bgClass: "bg-muted/30",
                },
                {
                  label: "In Progress", tasks: inProgress, icon: Clock,
                  headerClass: "text-violet-600 dark:text-violet-400",
                  bgClass: "bg-violet-50/50 dark:bg-violet-950/30",
                },
                {
                  label: "Done", tasks: done, icon: CheckCircle2,
                  headerClass: "text-emerald-600 dark:text-emerald-400",
                  bgClass: "bg-emerald-50/50 dark:bg-emerald-950/30",
                },
              ].map(({ label, tasks: colTasks, icon: Icon, headerClass, bgClass }) => (
                <div key={label} className="space-y-2">
                  <div className={cn("flex items-center gap-2 text-sm font-semibold px-1", headerClass)}>
                    <Icon className="h-4 w-4" />
                    {label}
                    <span className="ml-auto text-xs font-normal bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className={cn("space-y-2 min-h-[5rem] rounded-xl p-2.5", bgClass)}>
                    {colTasks.length === 0 ? (
                      <p className="text-xs text-center py-6 text-muted-foreground">No tasks here</p>
                    ) : (
                      colTasks.map((t) => <TaskCard key={t.id} task={t} compact />)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            {sortedDates.length === 0 ? (
              <div className="rounded-xl border border-dashed py-14 text-center mt-3">
                <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No completed tasks yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Completed tasks will appear here grouped by date.
                </p>
              </div>
            ) : (
              <div className="space-y-6 mt-3">
                {sortedDates.map((date) => {
                  const dayTasks = completedByDate[date];
                  const label =
                    date === format(new Date(), "yyyy-MM-dd")
                      ? "Today"
                      : format(parseISO(date), "EEEE, MMMM d, yyyy");
                  return (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""} completed
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 border-l-2 border-dashed border-muted pl-6 space-y-2">
                        {dayTasks.map((task) => (
                          <div key={task.id} className="relative">
                            <div className="absolute -left-[1.85rem] top-3.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                            <TaskCard task={task} compact />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TaskForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultProjectId={project.id}
      />
    </>
  );
}
