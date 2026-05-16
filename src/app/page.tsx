"use client";

import React, { useState, useMemo } from "react";
import { format, addDays, parseISO } from "date-fns";
import { useStore } from "@/store";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskForm } from "@/components/tasks/task-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/dashboard/loading-skeleton";
import { PRIORITY_CONFIG } from "@/lib/utils";
import {
  CheckCircle2, Clock, ListTodo, AlertTriangle,
  TrendingUp, Plus, ArrowRight, Zap, Sparkles, CalendarClock,
} from "lucide-react";
import Link from "next/link";
import type { Priority } from "@/lib/types";

function StatCard({
  label, value, icon: Icon, color, borderColor, sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  sub?: string;
}) {
  return (
    <Card className={`relative overflow-hidden border-l-4 ${borderColor}`}>
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { tasks, projects, getOverdueTasks, isLoaded } = useStore();
  const { data: session } = useSession();
  const [addOpen, setAddOpen] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const greeting = getGreeting();

  const firstName = useMemo(() => {
    const name = session?.user?.name;
    if (!name) return "";
    return name.split(" ")[0];
  }, [session?.user?.name]);

  const {
    todayTasks,
    overdueTasks,
    doneTasks,
    inProgressTasks,
    urgentTasks,
    upcomingTasks,
    completionRate,
    todayDone,
    todayProgressPct,
  } = useMemo(() => {
    const todayTasks = tasks
      .filter((t) => t.scheduledDate === today || (t.dueDate === today && !t.scheduledDate))
      .sort((a, b) => {
        // Tasks with scheduledTime first, sorted by time; then tasks without time
        if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
        if (a.scheduledTime) return -1;
        if (b.scheduledTime) return 1;
        return 0;
      });

    const overdueTasks = getOverdueTasks();
    const doneTasks = tasks.filter((t) => t.status === "done");
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

    const urgentTasks = tasks
      .filter((t) => t.priority === "urgent" && t.status !== "done")
      .slice(0, 3);

    // Upcoming: dueDate in the next 1-6 days (not today, not overdue), not done
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const sixDaysOut = format(addDays(new Date(), 6), "yyyy-MM-dd");
    const upcomingTasks = tasks
      .filter((t) =>
        t.dueDate &&
        t.dueDate >= tomorrow &&
        t.dueDate <= sixDaysOut &&
        t.status !== "done"
      )
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 5);

    const completionRate = tasks.length
      ? Math.round((doneTasks.length / tasks.length) * 100)
      : 0;

    const todayDone = todayTasks.filter((t) => t.status === "done").length;
    const todayProgressPct = todayTasks.length
      ? Math.round((todayDone / todayTasks.length) * 100)
      : 0;

    return {
      todayTasks,
      overdueTasks,
      doneTasks,
      inProgressTasks,
      urgentTasks,
      upcomingTasks,
      completionRate,
      todayDone,
      todayProgressPct,
    };
  }, [tasks, today, getOverdueTasks]);

  if (!isLoaded) {
    return (
      <>
        <Header
          title={`${greeting} 👋`}
          subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
        />
        <DashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <Header
        title={`${greeting} 👋`}
        subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 md:p-6 text-white shadow-lg">
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-indigo-100 mb-0.5">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </p>
                <h2 className="text-xl md:text-2xl font-bold leading-tight">
                  {greeting}{firstName ? `, ${firstName}` : ""}! Ready to crush it?
                </h2>
                {todayTasks.length > 0 ? (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-indigo-100">Today&apos;s progress</span>
                      <span className="font-semibold">
                        {todayDone} / {todayTasks.length} tasks
                      </span>
                    </div>
                    <Progress value={todayProgressPct} />
                    <p className="text-xs text-indigo-200">
                      {todayProgressPct === 100
                        ? "All done for today!"
                        : `${todayProgressPct}% complete — keep going!`}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-indigo-100">
                    No tasks scheduled yet — add one to get started.
                  </p>
                )}
              </div>
              <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shrink-0">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
          {/* Decorative blobs */}
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/5" />
          <div className="absolute -right-4 -bottom-10 h-28 w-28 rounded-full bg-white/5" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Today"
            value={todayTasks.length}
            icon={ListTodo}
            color="bg-primary/10 text-primary"
            borderColor="border-l-primary"
            sub={`${todayDone} done`}
          />
          <StatCard
            label="In Progress"
            value={inProgressTasks.length}
            icon={Clock}
            color="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
            borderColor="border-l-violet-500"
          />
          <StatCard
            label="Overdue"
            value={overdueTasks.length}
            icon={AlertTriangle}
            color="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
            borderColor="border-l-red-500"
          />
          <StatCard
            label="Completed"
            value={doneTasks.length}
            icon={CheckCircle2}
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
            borderColor="border-l-emerald-500"
            sub={`${completionRate}% overall`}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Today's tasks + upcoming + overdue — 2 col */}
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
                  {/* Illustrated icon area */}
                  <div className="relative mb-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 flex items-center justify-center">
                      <CheckCircle2 className="h-9 w-9 text-primary/40" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900 dark:to-violet-900 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-primary/60" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No tasks scheduled for today
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                    A clear schedule — use it wisely!
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddOpen(true)}
                    className="gap-1.5"
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

            {/* Due Soon */}
            {upcomingTasks.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-500" />
                  <h2 className="font-semibold text-blue-600 dark:text-blue-400">
                    Due Soon ({upcomingTasks.length})
                  </h2>
                </div>
                {upcomingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} compact />
                ))}
                <Link href="/tasks">
                  <Button variant="outline" size="sm" className="w-full gap-2 mt-1">
                    View all tasks
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
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
