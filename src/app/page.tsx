"use client";

import React, { useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskForm } from "@/components/tasks/task-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRIORITY_CONFIG } from "@/lib/utils";
import {
  CheckCircle2, Clock, ListTodo, AlertTriangle,
  TrendingUp, Plus, ArrowRight, Zap,
} from "lucide-react";
import Link from "next/link";
import type { Priority } from "@/lib/types";

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { tasks, projects, getOverdueTasks } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const greeting = getGreeting();

  const todayTasks = tasks.filter(
    (t) => t.scheduledDate === today || (t.dueDate === today && !t.scheduledDate)
  );
  const overdueTasks = getOverdueTasks();
  const doneTasks = tasks.filter((t) => t.status === "done");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  const urgentTasks = tasks
    .filter((t) => t.priority === "urgent" && t.status !== "done")
    .slice(0, 3);

  const completionRate = tasks.length
    ? Math.round((doneTasks.length / tasks.length) * 100)
    : 0;

  return (
    <>
      <Header
        title={`${greeting} 👋`}
        subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Today"
            value={todayTasks.length}
            icon={ListTodo}
            color="bg-primary/10 text-primary"
            sub={`${todayTasks.filter((t) => t.status === "done").length} done`}
          />
          <StatCard
            label="In Progress"
            value={inProgressTasks.length}
            icon={Clock}
            color="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
          />
          <StatCard
            label="Overdue"
            value={overdueTasks.length}
            icon={AlertTriangle}
            color="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
          />
          <StatCard
            label="Completed"
            value={doneTasks.length}
            icon={CheckCircle2}
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
            sub={`${completionRate}% completion`}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Today's tasks - 2 col */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Today&apos;s Tasks</h2>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            {todayTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No tasks scheduled for today
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Schedule something
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}

            {/* Overdue */}
            {overdueTasks.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h2 className="font-semibold text-red-600 dark:text-red-400">
                    Overdue ({overdueTasks.length})
                  </h2>
                </div>
                {overdueTasks.slice(0, 3).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {overdueTasks.length > 3 && (
                  <Link href="/tasks">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      View all overdue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar cards */}
          <div className="space-y-4">
            {/* Urgent tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  Urgent
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {urgentTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No urgent tasks 🎉
                  </p>
                ) : (
                  urgentTasks.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Projects overview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Projects</CardTitle>
                  <Link href="/projects">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                {projects.slice(0, 4).map((project) => {
                  const projectTasks = tasks.filter((t) => t.projectId === project.id);
                  const done = projectTasks.filter((t) => t.status === "done").length;
                  const pct = projectTasks.length
                    ? Math.round((done / projectTasks.length) * 100)
                    : 0;
                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors cursor-pointer">
                        <span className="text-lg">{project.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: project.color,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {done}/{projectTasks.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {projects.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No projects yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Priority breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Priority Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => {
                  const count = tasks.filter(
                    (t) => t.priority === p && t.status !== "done"
                  ).length;
                  return (
                    <div key={p} className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[p].dot}`}
                      />
                      <span className="text-xs flex-1 text-muted-foreground">
                        {PRIORITY_CONFIG[p].label}
                      </span>
                      <span className="text-xs font-semibold">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <TaskForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={today}
      />
    </>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
