"use client";

import React, { useMemo } from "react";
import { format, addDays, parseISO, subDays } from "date-fns";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITY_CONFIG } from "@/lib/utils";
import type { Priority } from "@/lib/types";
import {
  Flame, TrendingUp, CheckCircle2, AlertTriangle, Target, BarChart2,
} from "lucide-react";

function computeStreak(completedDates: Set<string>): number {
  let streak = 0;
  let d = new Date();
  while (streak < 366) {
    const dayStr = format(d, "yyyy-MM-dd");
    if (completedDates.has(dayStr)) {
      streak++;
    } else if (dayStr === format(new Date(), "yyyy-MM-dd")) {
      // today has no completions yet — don't break streak, skip to yesterday
    } else {
      break;
    }
    d = subDays(d, 1);
  }
  return streak;
}

export default function AnalyticsPage() {
  const { tasks, projects, isLoaded } = useStore();

  const today = format(new Date(), "yyyy-MM-dd");

  const analytics = useMemo(() => {
    const done = tasks.filter((t) => t.status === "done");
    const active = tasks.filter((t) => t.status !== "done");
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== "done");

    // Completion rate
    const completionRate = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

    // 7-day completion trend
    const last7: { label: string; date: string; count: number }[] = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateStr = format(d, "yyyy-MM-dd");
      return {
        label: format(d, "EEE"),
        date: dateStr,
        count: done.filter((t) => t.completedAt && t.completedAt.startsWith(dateStr)).length,
      };
    });
    const maxBar = Math.max(...last7.map((d) => d.count), 1);

    // Streak
    const completedDates = new Set(
      done.filter((t) => t.completedAt).map((t) => t.completedAt!.slice(0, 10))
    );
    const streak = computeStreak(completedDates);

    // Priority breakdown
    const priorities = (["urgent", "high", "medium", "low"] as Priority[]).map((p) => {
      const total = tasks.filter((t) => t.priority === p).length;
      const doneCount = done.filter((t) => t.priority === p).length;
      const overduePri = overdue.filter((t) => t.priority === p).length;
      const rate = total ? Math.round((doneCount / total) * 100) : 0;
      return { priority: p, total, done: doneCount, overdue: overduePri, rate };
    });

    // Project progress
    const projectStats = projects.map((proj) => {
      const projTasks = tasks.filter((t) => t.projectId === proj.id);
      const projDone = projTasks.filter((t) => t.status === "done").length;
      const rate = projTasks.length ? Math.round((projDone / projTasks.length) * 100) : 0;
      return { project: proj, total: projTasks.length, done: projDone, rate };
    }).filter((p) => p.total > 0).sort((a, b) => b.total - a.total);

    // Most productive hour (from completedAt timestamps)
    const hourMap: Record<number, number> = {};
    for (const t of done) {
      if (!t.completedAt) continue;
      const h = parseISO(t.completedAt).getHours();
      hourMap[h] = (hourMap[h] ?? 0) + 1;
    }
    const topHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    const topHourLabel = topHour
      ? (() => {
          const h = Number(topHour[0]);
          return h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
        })()
      : null;

    return {
      done, active, overdue, completionRate, last7, maxBar, streak,
      priorities, projectStats, topHourLabel,
    };
  }, [tasks, projects, today]);

  if (!isLoaded) {
    return (
      <>
        <Header title="Analytics" />
        <div className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Analytics" subtitle="Your productivity at a glance" />

      <div className="p-4 md:p-6 space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Completion Rate",
              value: `${analytics.completionRate}%`,
              icon: Target,
              color: "text-primary",
              bg: "bg-primary/10",
              sub: `${analytics.done.length} of ${tasks.length} tasks`,
            },
            {
              label: "Current Streak",
              value: analytics.streak,
              icon: Flame,
              color: "text-orange-500",
              bg: "bg-orange-50 dark:bg-orange-950/50",
              sub: analytics.streak === 1 ? "1 day" : `${analytics.streak} days`,
            },
            {
              label: "Active Tasks",
              value: analytics.active.length,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bg: "bg-emerald-50 dark:bg-emerald-950/50",
              sub: `${analytics.done.length} completed`,
            },
            {
              label: "Overdue",
              value: analytics.overdue.length,
              icon: AlertTriangle,
              color: "text-red-500",
              bg: "bg-red-50 dark:bg-red-950/50",
              sub: analytics.overdue.length === 0 ? "All on track!" : "Need attention",
            },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <Card key={label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-0.5">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 7-day trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              7-Day Completion Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-end gap-2 h-28">
              {analytics.last7.map((day) => {
                const pct = Math.max(4, (day.count / analytics.maxBar) * 100);
                const isToday = day.date === today;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                      {day.count > 0 ? day.count : ""}
                    </span>
                    <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                      <div
                        className={`w-full rounded-t-md transition-all ${isToday ? "bg-primary" : "bg-primary/30"}`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {analytics.topHourLabel && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Most productive hour: <span className="font-semibold text-foreground">{analytics.topHourLabel}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Priority breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                By Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {analytics.priorities.map(({ priority, total, done, overdue, rate }) => {
                const cfg = PRIORITY_CONFIG[priority];
                return (
                  <div key={priority} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                        <span className="font-medium">{cfg.label}</span>
                        {overdue > 0 && (
                          <span className="text-red-500 text-[10px]">({overdue} overdue)</span>
                        )}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {done}/{total} · {rate}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${rate}%`, backgroundColor: cfg.hex }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Project progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Project Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {analytics.projectStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No projects yet</p>
              ) : (
                <div className="space-y-4">
                  {analytics.projectStats.map(({ project, total, done, rate }) => (
                    <div key={project.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                          <span className="font-medium truncate max-w-[140px]">{project.name}</span>
                        </span>
                        <span className="text-muted-foreground tabular-nums shrink-0">
                          {done}/{total} · {rate}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: project.color }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </>
  );
}
