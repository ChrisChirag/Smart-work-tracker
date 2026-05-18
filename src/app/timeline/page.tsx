"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  format, addDays, isToday, isSameDay,
  startOfWeek, endOfWeek, eachDayOfInterval,
} from "date-fns";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, PRIORITY_CONFIG } from "@/lib/utils";
import { autoSchedule } from "@/lib/schedule";
import type { Task, Priority } from "@/lib/types";
import {
  ChevronLeft, ChevronRight, CalendarDays, CalendarRange, LayoutList, Zap, AlertCircle,
  Copy, ArrowRight, Pin, CheckSquare,
} from "lucide-react";

// ─── Layout constants ────────────────────────────────────────────────────────
const START_HOUR = 9;  // 9 AM
const END_HOUR = 18;   // 6 PM (exclusive end — last visible slot is 17:xx)
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
const ROW_H = 64; // px per hour
const TIME_W = 52; // px for the time-label gutter

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

type ViewMode = "day" | "week" | "work-week";

// ─── Auto-schedule preview dialog ────────────────────────────────────────────
function AutoScheduleDialog({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
}) {
  const { tasks, projects, batchScheduleTasks } = useStore();

  const result = useMemo(() => {
    if (!open) return null;
    const alreadyScheduled = tasks.filter((t) => t.scheduledDate === date && t.scheduledTime && t.status !== "done");
    const candidates = tasks.filter(
      (t) =>
        t.status !== "done" &&
        !t.scheduledTime &&
        (t.scheduledDate === date || (!t.scheduledDate && (!t.dueDate || t.dueDate >= date)))
    );
    return autoSchedule(candidates, alreadyScheduled, date);
  }, [open, tasks, date]);

  const handleApply = () => {
    if (result && result.assignments.length > 0) {
      batchScheduleTasks(result.assignments);
    }
    onClose();
  };

  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="px-6 pt-5 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Auto-Schedule for {format(new Date(date + "T12:00:00"), "MMMM d")}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pt-4 pb-2 space-y-3">
          {result.assignments.length === 0 && result.unscheduled.length === 0 ? (
            <div className="rounded-xl border border-dashed py-8 text-center">
              <Zap className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No tasks to schedule</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create tasks without a time and they will appear here.
              </p>
            </div>
          ) : (
            <>
              {result.assignments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Will be scheduled ({result.assignments.length})
                  </p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {result.assignments.map((a) => {
                      const task = tasks.find((t) => t.id === a.taskId);
                      if (!task) return null;
                      const proj = projects.find((p) => p.id === task.projectId);
                      return (
                        <div
                          key={a.taskId}
                          className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                        >
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: PRIORITY_CONFIG[task.priority].hex }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            {proj && (
                              <p className="text-xs text-muted-foreground truncate">
                                {proj.name}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {a.scheduledTime}
                            </p>
                            <p
                              className="text-[10px] font-medium"
                              style={{ color: PRIORITY_CONFIG[task.priority].hex }}
                            >
                              {PRIORITY_CONFIG[task.priority].label}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.unscheduled.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    Could not fit ({result.unscheduled.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {result.unscheduled.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                        <div
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: PRIORITY_CONFIG[task.priority].hex }}
                        />
                        <p className="text-xs text-amber-700 dark:text-amber-400 truncate">{task.title}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The working day is full. Schedule these on another day or remove time blocks.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 pb-5 pt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={result.assignments.length === 0}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0"
          >
            <Zap className="h-3.5 w-3.5" />
            Apply Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Move / Duplicate dialog — supports single or multiple tasks ──────────────
function MoveOrDuplicateDialog({
  tasks,
  fromDate,
  toDate,
  onClose,
}: {
  tasks: Task[];
  fromDate: string;
  toDate: string;
  onClose: () => void;
}) {
  const { updateTask, addTask } = useStore();
  const count = tasks.length;

  const handleMove = () => {
    tasks.forEach((task) => {
      updateTask(task.id, { scheduledDate: toDate, scheduledTime: undefined });
    });
    onClose();
  };

  const handleDuplicate = () => {
    tasks.forEach((task) => {
      addTask({
        title: task.title,
        description: task.description,
        status: "todo",
        priority: task.priority,
        projectId: task.projectId,
        tagIds: task.tagIds,
        dueDate: task.dueDate,
        scheduledDate: toDate,
        scheduledTime: undefined,
        completedAt: undefined,
      });
    });
    onClose();
  };

  const fromLabel = format(new Date(fromDate + "T12:00"), "EEE, MMM d");
  const toLabel   = format(new Date(toDate   + "T12:00"), "EEE, MMM d");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="px-5 pt-5 pb-1">
          <DialogHeader>
            <DialogTitle className="text-base">
              {count === 1 ? "Move or duplicate task?" : `Move or duplicate ${count} tasks?`}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="px-5 pb-2 space-y-3">
          {count === 1 ? (
            <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
              <span className="font-medium text-foreground">{tasks[0].title}</span>
            </p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <div
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: PRIORITY_CONFIG[t.priority].hex }}
                  />
                  <p className="text-sm text-foreground truncate font-medium">{t.title}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-2 py-1">{fromLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            <span className="rounded-md bg-primary/10 text-primary px-2 py-1 font-medium">{toLabel}</span>
          </div>
        </div>
        <DialogFooter className="px-5 pb-5 pt-2 gap-2 flex-col sm:flex-row">
          <Button variant="outline" size="sm" onClick={onClose} className="sm:mr-auto">Cancel</Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
            {count === 1 ? `Duplicate to ${toLabel}` : `Duplicate ${count} here`}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0"
            onClick={handleMove}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {count === 1 ? `Move to ${toLabel}` : `Move ${count} here`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  // Auto-schedule dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Multi-select state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Drag-and-drop state
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ tasks: Task[]; fromDate: string; toDate: string } | null>(null);
  const dragFromDate = useRef<string>("");

  const clearSelection = useCallback(() => setSelectedTaskIds(new Set()), []);

  // Escape clears selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection]);

  // Current time indicator — updates every minute, offset from START_HOUR
  const calcNowTop = () => {
    const d = new Date();
    const mins = d.getHours() * 60 + d.getMinutes();
    return ((mins - START_HOUR * 60) / 60) * ROW_H;
  };
  const [nowTop, setNowTop] = useState(calcNowTop);

  useEffect(() => {
    const id = setInterval(() => setNowTop(calcNowTop()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to top (9 AM) on mount / view switch
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current && isLoaded) {
      scrollRef.current.scrollTop = 0;
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
  // Work week = Mon–Fri only (getDay: Mon=1 … Fri=5)
  const workWeekDays = weekDays.filter((d) => d.getDay() >= 1 && d.getDay() <= 5);
  const displayDays =
    viewMode === "week" ? weekDays :
    viewMode === "work-week" ? workWeekDays :
    [selectedDate];

  const getTasksForDay = (dateStr: string) =>
    tasks.filter((t) => t.scheduledDate === dateStr);

  // Count unscheduled (no time) tasks for the selected day
  const scheduleDate = format(selectedDate, "yyyy-MM-dd");
  const unscheduledCount = useMemo(() => {
    const today = scheduleDate;
    return tasks.filter(
      (t) =>
        t.status !== "done" &&
        !t.scheduledTime &&
        (t.scheduledDate === today || (!t.scheduledDate && (!t.dueDate || t.dueDate >= today)))
    ).length;
  }, [tasks, scheduleDate]);

  // ─── Interaction handlers ───────────────────────────────────────────────────
  const handleSlotDblClick = (day: Date, hour: number) => {
    setNewDate(format(day, "yyyy-MM-dd"));
    setNewTime(`${String(hour).padStart(2, "0")}:00`);
    setAddOpen(true);
  };

  const handleTaskClick = (task: Task, e: React.MouseEvent) => {
    if (draggingIds.length > 0) return;
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+click toggles selection without opening the dialog
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        if (next.has(task.id)) next.delete(task.id);
        else next.add(task.id);
        return next;
      });
    } else {
      // Regular click: clear selection and open edit dialog
      clearSelection();
      setEditTask(task);
      setEditOpen(true);
    }
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
  const subtitleText =
    viewMode === "day"
      ? format(selectedDate, "EEEE, MMMM d, yyyy")
      : viewMode === "work-week"
        ? `${format(workWeekDays[0], "MMM d")} – ${format(workWeekDays[4], "MMM d, yyyy")} (Mon–Fri)`
        : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  const currentHour = new Date().getHours();
  const showNowLine =
    displayDays.some((d) => isToday(d)) &&
    currentHour >= START_HOUR &&
    currentHour < END_HOUR;

  const isDraggingAny = draggingIds.length > 0;

  return (
    <>
      <Header title="Timeline" subtitle={subtitleText} />

      {/* Full remaining viewport height */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">

        {/* ── Controls bar ── */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-b bg-background flex-wrap">
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

          <div className="flex items-center gap-2">
            {/* Multi-select hint */}
            {selectedTaskIds.size > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs text-primary font-medium">
                <CheckSquare className="h-3.5 w-3.5" />
                {selectedTaskIds.size} selected — drag to move
                <button
                  className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  onClick={clearSelection}
                  title="Clear selection (Esc)"
                >
                  ×
                </button>
              </div>
            )}

            {/* Auto-schedule button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
              onClick={() => setScheduleOpen(true)}
            >
              <Zap className="h-3.5 w-3.5" />
              Auto-schedule
              {unscheduledCount > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                  {unscheduledCount}
                </span>
              )}
            </Button>

            <div className="flex rounded-lg border p-0.5">
              {([
                { mode: "day" as ViewMode, icon: LayoutList, label: "Day" },
                { mode: "work-week" as ViewMode, icon: CalendarRange, label: "Work Week" },
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
                    const bg = proj?.color ?? PRIORITY_CONFIG[t.priority].hex;
                    return (
                      <div
                        key={t.id}
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: bg }}
                        onClick={() => handleTaskClick(t, { ctrlKey: false, metaKey: false } as React.MouseEvent)}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ── Scrollable hourly grid (9 AM – 6 PM) ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <div className="flex" style={{ height: HOURS.length * ROW_H }}>

              {/* Time gutter */}
              <div className="shrink-0 relative select-none" style={{ width: TIME_W }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full flex items-start justify-end pr-2"
                    style={{ top: (h - START_HOUR) * ROW_H, height: ROW_H }}
                  >
                    <span className="text-[10px] text-muted-foreground -translate-y-2 whitespace-nowrap">
                      {fmtHour(h)}
                    </span>
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
                    style={{ top: (h - START_HOUR) * ROW_H }}
                  />
                ))}

                {/* Half-hour lines (lighter) */}
                {HOURS.map((h) => (
                  <div
                    key={`h${h}`}
                    className="absolute left-0 right-0 border-t border-border/20 border-dashed"
                    style={{ top: (h - START_HOUR) * ROW_H + ROW_H / 2 }}
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

                      {/* Hour click zones — double-click to add, drag-over to drop */}
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="absolute transition-colors cursor-crosshair group"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: (h - START_HOUR) * ROW_H,
                            height: ROW_H,
                          }}
                          onDoubleClick={() => handleSlotDblClick(day, h)}
                          onClick={() => {
                            // Clicking empty grid clears selection
                            if (selectedTaskIds.size > 0) clearSelection();
                          }}
                          title={`Double-click to add task at ${fmtHour(h)}`}
                          onDragOver={(e) => {
                            if (isDraggingAny) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              setDragOverDate(dayStr);
                            }
                          }}
                          onDragLeave={(e) => {
                            // Only clear when leaving the column entirely
                            if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                              setDragOverDate(null);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const taskIdsJson = e.dataTransfer.getData("taskIds");
                            const fromDate = dragFromDate.current;
                            if (taskIdsJson && fromDate && fromDate !== dayStr) {
                              const ids: string[] = JSON.parse(taskIdsJson);
                              const droppedTasks = ids
                                .map((id) => tasks.find((t) => t.id === id))
                                .filter(Boolean) as Task[];
                              if (droppedTasks.length > 0) {
                                setPendingDrop({ tasks: droppedTasks, fromDate, toDate: dayStr });
                              }
                            }
                            setDraggingIds([]);
                            setDragOverDate(null);
                          }}
                        >
                          {!isDraggingAny && (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-primary/0 group-hover:text-primary/40 transition-colors pointer-events-none select-none">
                              double-click to add
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Lunch break stripe (1–2 PM) */}
                      <div
                        className="absolute pointer-events-none z-[5]"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          top: (13 - START_HOUR) * ROW_H,
                          height: ROW_H,
                          background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(128,128,128,0.06) 4px, rgba(128,128,128,0.06) 8px)",
                        }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/50 font-medium select-none">
                          Lunch
                        </span>
                      </div>

                      {/* Drag-over highlight */}
                      {dragOverDate === dayStr && isDraggingAny && (
                        <div
                          className="absolute top-0 bottom-0 pointer-events-none z-[6] ring-2 ring-inset ring-primary/50 bg-primary/5 rounded-sm"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                      )}

                      {/* Task blocks — variable height, draggable */}
                      {(() => {
                        const toMins = (t: Task) => {
                          const [h, m] = (t.scheduledTime ?? "0:0").split(":").map(Number);
                          return h * 60 + m;
                        };
                        // Only render tasks within the visible 9am–6pm window
                        const visibleTasks = timedTasks.filter((t) => {
                          const m = toMins(t);
                          return m >= START_HOUR * 60 && m < END_HOUR * 60;
                        });
                        const sorted = [...visibleTasks].sort((a, b) => toMins(a) - toMins(b));
                        const WORK_END_MINS = END_HOUR * 60;

                        return sorted.map((task, idx) => {
                          const startMins = toMins(task);
                          const nextMins = idx < sorted.length - 1 ? toMins(sorted[idx + 1]) : WORK_END_MINS;
                          const durationMins = Math.max(30, nextMins - startMins);
                          // Offset top from START_HOUR
                          const top = ((startMins - START_HOUR * 60) / 60) * ROW_H;
                          const height = Math.max(ROW_H / 2, (durationMins / 60) * ROW_H) - 3;
                          const proj = projects.find((p) => p.id === task.projectId);
                          // Always use priority colour; project shown as dot + name in subtitle
                          const bg = PRIORITY_CONFIG[task.priority].hex;
                          const isDone = task.status === "done";
                          const isSelected = selectedTaskIds.has(task.id);
                          const isDraggingThis = draggingIds.includes(task.id);

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "move";
                                // If this task is part of a multi-selection, drag all selected
                                let idsToDrag: string[];
                                if (isSelected && selectedTaskIds.size > 1) {
                                  idsToDrag = Array.from(selectedTaskIds);
                                } else {
                                  idsToDrag = [task.id];
                                  // Auto-select just this task
                                  setSelectedTaskIds(new Set([task.id]));
                                }
                                e.dataTransfer.setData("taskIds", JSON.stringify(idsToDrag));
                                dragFromDate.current = dayStr;
                                setDraggingIds(idsToDrag);
                              }}
                              onDragEnd={() => { setDraggingIds([]); setDragOverDate(null); }}
                              onClick={(e) => handleTaskClick(task, e)}
                              className={cn(
                                "absolute rounded-md px-2 py-1.5 text-white cursor-grab active:cursor-grabbing z-10 shadow-sm overflow-hidden select-none",
                                "hover:brightness-110 transition-all",
                                isDone && "opacity-50",
                                isDraggingThis && "opacity-40 scale-[0.98]",
                                // Selected ring
                                isSelected && !isDraggingThis && "ring-2 ring-white ring-offset-1 ring-offset-transparent brightness-110"
                              )}
                              style={{
                                left: `calc(${leftPct}% + 3px)`,
                                width: `calc(${widthPct}% - 6px)`,
                                top: top + 1,
                                height,
                                backgroundColor: bg,
                              }}
                            >
                              <p className="text-xs font-semibold leading-tight truncate flex items-center gap-1">
                                {isDone ? "✓ " : ""}
                                {task.title}
                                {task.pinnedTime && (
                                  <Pin className="h-2.5 w-2.5 shrink-0 opacity-80" aria-label="Pinned time" />
                                )}
                                {isSelected && (
                                  <CheckSquare className="h-2.5 w-2.5 shrink-0 opacity-90 ml-auto" />
                                )}
                              </p>
                              {durationMins >= 45 && (
                                <p className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1.5">
                                  {task.scheduledTime}
                                  {proj && (
                                    <>
                                      <span
                                        className="h-1.5 w-1.5 rounded-full shrink-0 inline-block opacity-90"
                                        style={{ backgroundColor: proj.color }}
                                      />
                                      {proj.name}
                                    </>
                                  )}
                                </p>
                              )}
                            </div>
                          );
                        });
                      })()}
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

      {/* Auto-schedule preview */}
      <AutoScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        date={scheduleDate}
      />

      {/* Move / Duplicate dialog */}
      {pendingDrop && (
        <MoveOrDuplicateDialog
          tasks={pendingDrop.tasks}
          fromDate={pendingDrop.fromDate}
          toDate={pendingDrop.toDate}
          onClose={() => { setPendingDrop(null); clearSelection(); }}
        />
      )}
    </>
  );
}
