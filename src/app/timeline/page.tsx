"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  format, addDays, isToday, isSameDay,
  startOfWeek, endOfWeek, eachDayOfInterval,
} from "date-fns";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Task, Priority } from "@/lib/types";
import {
  ChevronLeft, ChevronRight, CalendarDays, LayoutList,
} from "lucide-react";

// ─── Layout constants ────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_H = 64; // px per hour
const TIME_W = 52; // px for the time-label gutter

// Priority → solid hex for task blocks
const PRIORITY_HEX: Record<Priority, string> = {
  urgent: "#ef4444",
  high:   "#f97316",
  medium: "#6366f1",
  low:    "#94a3b8",
};

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

type ViewMode = "day" | "week";

// ─── Component ───────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const { tasks, projects, isLoaded } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  // Task form state
  const [addOpen, setAddOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editTask, setEditTask] = useState<Task | undefined>();
  const [editOpen, setEditOpen] = useState(false);

  // Current time indicator — updates every minute
  const [nowTop, setNowTop] = useState(() => {
    const d = new Date();
    return ((d.getHours() * 60 + d.getMinutes()) / 60) * ROW_H;
  });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowTop(((d.getHours() * 60 + d.getMinutes()) / 60) * ROW_H);
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to ~1 hr before now on mount / view switch
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current && isLoaded) {
      const d = new Date();
      scrollRef.current.scrollTop = Math.max(0, (d.getHours() - 1) * ROW_H);
    }
  }, [isLoaded, viewMode]);

  // ─── Navigation ────────────────────────────────────────────────────────────
  const navigate = (dir: 1 | -1) =>
    setSelectedDate((d) => addDays(d, viewMode === "day" ? dir : dir * 7));

  const goToday = () => setSelectedDate(new Date());

  // ─── Data helpers ───────────────────────────────────────────────────────────
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const displayDays = viewMode === "week" ? weekDays : [selectedDate];

  const getTasksForDay = (dateStr: string) =>
    tasks.filter((t) => t.scheduledDate === dateStr);

  // ─── Interaction handlers ───────────────────────────────────────────────────
  const handleSlotDblClick = (day: Date, hour: number) => {
    setNewDate(format(day, "yyyy-MM-dd"));
    setNewTime(`${String(hour).padStart(2, "0")}:00`);
    setAddOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setEditTask(task);
    setEditOpen(true);
  };

  const handleAddClose = () => {
    setAddOpen(false);
    setNewDate("");
    setNewTime("");
  };

  // ─── Skeleton ───────────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <>
        <Header title="Timeline" />
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const subtitleText = viewMode === "day"
    ? format(selectedDate, "EEEE, MMMM d, yyyy")
    : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  const showNowLine = displayDays.some((d) => isToday(d));

  return (
    <>
      <Header title="Timeline" subtitle={subtitleText} />

      {/* Full remaining viewport height */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">

        {/* ── Controls bar ── */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex rounded-lg border p-0.5">
            {([
              { mode: "day" as ViewMode, icon: LayoutList, label: "Day" },
              { mode: "week" as ViewMode, icon: CalendarDays, label: "Week" },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  viewMode === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Calendar ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* Day header row */}
          <div className="shrink-0 flex border-b select-none bg-background">
            <div className="shrink-0" style={{ width: TIME_W }} />
            {displayDays.map((day) => {
              const today = isToday(day);
              const selected = isSameDay(day, selectedDate);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex-1 flex flex-col items-center py-2 border-l text-center cursor-pointer hover:bg-muted/40 transition-colors",
                    (today || selected) && "bg-primary/5"
                  )}
                  onClick={() => { setSelectedDate(day); setViewMode("day"); }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors",
                      today
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All-day strip */}
          <div className="shrink-0 flex border-b min-h-[32px] max-h-20 overflow-y-auto bg-muted/20">
            <div
              className="shrink-0 flex items-start justify-end pt-1.5 pr-2 text-[10px] text-muted-foreground"
              style={{ width: TIME_W }}
            >
              All day
            </div>
            {displayDays.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const allDay = getTasksForDay(dayStr).filter((t) => !t.scheduledTime);
              return (
                <div key={dayStr} className="flex-1 border-l p-1 flex flex-col gap-0.5">
                  {allDay.map((t) => {
                    const proj = projects.find((p) => p.id === t.projectId);
                    const bg = proj?.color ?? PRIORITY_HEX[t.priority];
                    return (
                      <div
                        key={t.id}
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: bg }}
                        onClick={() => handleTaskClick(t)}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ── Scrollable hourly grid ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <div className="flex" style={{ height: 24 * ROW_H }}>

              {/* Time gutter */}
              <div className="shrink-0 relative select-none" style={{ width: TIME_W }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full flex items-start justify-end pr-2"
                    style={{ top: h * ROW_H, height: ROW_H }}
                  >
                    {h > 0 && (
                      <span className="text-[10px] text-muted-foreground -translate-y-2 whitespace-nowrap">
                        {fmtHour(h)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Days area */}
              <div className="flex-1 relative">

                {/* Horizontal hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/50"
                    style={{ top: h * ROW_H }}
                  />
                ))}

                {/* Half-hour lines (lighter) */}
                {HOURS.map((h) => (
                  <div
                    key={`h${h}`}
                    className="absolute left-0 right-0 border-t border-border/20 border-dashed"
                    style={{ top: h * ROW_H + ROW_H / 2 }}
                  />
                ))}

                {/* Per-day columns */}
                {displayDays.map((day, dayIdx) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const today = isToday(day);
                  const leftPct = (dayIdx / displayDays.length) * 100;
                  const widthPct = 100 / displayDays.length;
                  const timedTasks = getTasksForDay(dayStr).filter((t) => t.scheduledTime);

                  return (
                    <React.Fragment key={dayStr}>
                      {/* Vertical separator */}
                      <div
                        className="absolute top-0 bottom-0 border-l border-border/50 pointer-events-none"
                        style={{ left: `${leftPct}%` }}
                      />

                      {/* Today column tint */}
                      {today && (
                        <div
                          className="absolute top-0 bottom-0 bg-primary/[0.04] pointer-events-none"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                      )}

                      {/* Hour click zones — double-click to create task */}
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="absolute hover:bg-primary/[0.06] transition-colors cursor-crosshair group"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: h * ROW_H,
                            height: ROW_H,
                          }}
                          onDoubleClick={() => handleSlotDblClick(day, h)}
                          title={`Double-click to add task at ${fmtHour(h)}`}
                        >
                          {/* Hover hint */}
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-primary/0 group-hover:text-primary/40 transition-colors pointer-events-none select-none">
                            double-click to add
                          </span>
                        </div>
                      ))}

                      {/* Task blocks */}
                      {timedTasks.map((task) => {
                        const [th, tm] = (task.scheduledTime ?? "0:0").split(":").map(Number);
                        const top = (th + tm / 60) * ROW_H;
                        const proj = projects.find((p) => p.id === task.projectId);
                        const bg = proj?.color ?? PRIORITY_HEX[task.priority];
                        const isDone = task.status === "done";

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "absolute rounded-md px-2 py-1 text-white cursor-pointer z-10 shadow-sm overflow-hidden select-none",
                              "hover:brightness-110 active:scale-[0.98] transition-all",
                              isDone && "opacity-50"
                            )}
                            style={{
                              left: `calc(${leftPct}% + 3px)`,
                              width: `calc(${widthPct}% - 6px)`,
                              top: top + 1,
                              height: ROW_H - 3,
                              backgroundColor: bg,
                            }}
                            onClick={() => handleTaskClick(task)}
                          >
                            <p className="text-xs font-semibold leading-tight truncate">
                              {isDone ? "✓ " : ""}{task.title}
                            </p>
                            <p className="text-[10px] opacity-75 mt-0.5">
                              {task.scheduledTime}
                              {proj && ` · ${proj.emoji} ${proj.name}`}
                            </p>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* ── Current time indicator ── */}
                {showNowLine && (
                  <div
                    className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
                    style={{ top: nowTop }}
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0 ml-0.5" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add task form (from double-click) */}
      <TaskForm
        open={addOpen}
        onClose={handleAddClose}
        defaultDate={newDate}
        defaultTime={newTime}
      />

      {/* Edit task form (from task click) */}
      <TaskForm
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditTask(undefined); }}
        editTask={editTask}
      />
    </>
  );
}
