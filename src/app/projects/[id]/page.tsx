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
import { formatDateTime, cn } from "@/lib/utils";
import {
  Plus, ArrowLeft, CheckCircle2, Clock, Circle,
  Calendar, Activity,
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
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => router.push("/projects")} variant="outline">
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

  // Group completed tasks by date
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

  return (
    <>
      <Header
        title={`${project.emoji} ${project.name}`}
        subtitle={project.description}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Back + Add */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/projects")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            All Projects
          </Button>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: projectTasks.length, color: "text-foreground" },
            { label: "Todo", value: todo.length, color: "text-muted-foreground" },
            { label: "Active", value: inProgress.length, color: "text-violet-600 dark:text-violet-400" },
            { label: "Done", value: done.length, color: "text-emerald-600 dark:text-emerald-400" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Overall progress</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: project.color }}
            />
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {[
                { label: "To Do", tasks: todo, icon: Circle, color: "text-muted-foreground" },
                { label: "In Progress", tasks: inProgress, icon: Clock, color: "text-violet-600 dark:text-violet-400" },
                { label: "Done", tasks: done, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
              ].map(({ label, tasks: colTasks, icon: Icon, color }) => (
                <div key={label} className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
                    <Icon className="h-4 w-4" />
                    {label}
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[4rem] rounded-xl bg-muted/30 p-2">
                    {colTasks.length === 0 ? (
                      <p className="text-xs text-center py-4 text-muted-foreground">Empty</p>
                    ) : (
                      colTasks.map((t) => <TaskCard key={t.id} task={t} compact />)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* History / activity */}
          <TabsContent value="history">
            {sortedDates.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center">
                <p className="text-sm text-muted-foreground">No completed tasks yet</p>
              </div>
            ) : (
              <div className="space-y-6 mt-2">
                {sortedDates.map((date) => {
                  const dayTasks = completedByDate[date];
                  const label =
                    date === format(new Date(), "yyyy-MM-dd")
                      ? "Today"
                      : format(parseISO(date), "EEEE, MMMM d, yyyy");
                  return (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""} completed
                          </p>
                        </div>
                      </div>
                      <div className="ml-3.5 border-l-2 border-dashed border-muted pl-6 space-y-2">
                        {dayTasks.map((task) => (
                          <div key={task.id} className="relative">
                            <div className="absolute -left-[1.85rem] top-3 h-2 w-2 rounded-full bg-emerald-500" />
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
