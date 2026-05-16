"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { autoSchedule } from "@/lib/schedule";
import type { Task, Priority } from "@/lib/types";
import {
  ChevronLeft, ChevronRight, CalendarDays, LayoutList, Zap, AlertCircle,
  Copy, ArrowRight, Pin,
} from "lucide-react";

// ─── Layout constants ────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_H = 64; // px per hour
const TIME_W = 52; // px for the time-label gutter

const PRIORITY_HEX: Record<Priority, string> = {
  urgent: "#ef4444",
  high:   "#f97316",
  medium: "#6366f1",
  low:    "#94a3b8",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

type ViewMode = "day" | "week";

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
                            style={{ backgroundColor: PRIORITY_HEX[task.priority] }}
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
                              style={{ color: PRIORITY_HEX[task.priority] }}
                            >
                              {PRIORITY_LABEL[task.priority]}
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
                          style={{ backgroundColor: PRIORITY_HEX[task.priority] }}
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

// ─── Move / Duplicate dialog ─────────────────────────────────────────────────
function MoveOrDuplicateDialog({
  task,
  fromDate,
  toDate,
  onClose,
}: {
  task: Task;
  fromDate: string;
  toDate: string;
  onClose: () => void;
}) {
  const { updateTask, addTask } = useStore();

  const handleMove = () => {
    updateTask(task.id, { scheduledDate: toDate, scheduledTime: undefined });
    onClose();
  };

  const handleDuplicate = () => {
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
            <DialogTitle className="text-base">Move or duplicate task?</DialogTitle>
          </DialogHeader>
        </div>
        <div className="px-5 pb-2 space-y-3">
          <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
            <span className="font-medium text-foreground">{task.title}</span>
          </p>
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
            Duplicate to {toLabel}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0"
            onClick={handleMove}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Move to {toLabel}
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

  // Drag-and-drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ task: Task; fromDate: string; toDate: string } | null>(null);
  const dragFromDate = useRef<string>("");

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

                      {/* Hour click zones — double-click to add, drag-over to drop */}
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="absolute transition-colors cursor-crosshair group"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: h * ROW_H,
                            height: ROW_H,
                          }}
                          onDoubleClick={() => handleSlotDblClick(day, h)}
                          title={`Double-click to add task at ${fmtHour(h)}`}
                          onDragOver={(e) => {
                            if (draggingId) {
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
                            const taskId = e.dataTransfer.getData("taskId");
                            const fromDate = dragFromDate.current;
                            if (taskId && fromDate && fromDate !== dayStr) {
                              const task = tasks.find((t) => t.id === taskId);
                              if (task) setPendingDrop({ task, fromDate, toDate: dayStr });
                            }
                            setDraggingId(null);
                            setDragOverDate(null);
                          }}
                        >
                          {!draggingId && (
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
                          top: 13 * ROW_H,
                          height: ROW_H,
                          background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(128,128,128,0.06) 4px, rgba(128,128,128,0.06) 8px)",
                        }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/50 font-medium select-none">
                          Lunch
                        </span>
                      </div>

                      {/* Drag-over highlight */}
                      {dragOverDate === dayStr && draggingId && (
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
                        const sorted = [...timedTasks].sort((a, b) => toMins(a) - toMins(b));
                        const WORK_END_MINS = 18 * 60;

                        return sorted.map((task, idx) => {
                          const startMins = toMins(task);
                          const nextMins = idx < sorted.length - 1 ? toMins(sorted[idx + 1]) : WORK_END_MINS;
                          const durationMins = Math.max(30, nextMins - startMins);
                          const top = (startMins / 60) * ROW_H;
                          const height = Math.max(ROW_H / 2, (durationMins / 60) * ROW_H) - 3;
                          const proj = projects.find((p) => p.id === task.projectId);
                          const bg = proj?.color ?? PRIORITY_HEX[task.priority];
                          const isDone = task.status === "done";
                          const isDragging = draggingId === task.id;

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("taskId", task.id);
                                dragFromDate.current = dayStr;
                                setDraggingId(task.id);
                              }}
                              onDragEnd={() => { setDraggingId(null); setDragOverDate(null); }}
                              onClick={() => !isDragging && handleTaskClick(task)}
                              className={cn(
                                "absolute rounded-md px-2 py-1.5 text-white cursor-grab active:cursor-grabbing z-10 shadow-sm overflow-hidden select-none",
                                "hover:brightness-110 transition-all",
                                isDone && "opacity-50",
                                isDragging && "opacity-40 scale-[0.98]"
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
                              </p>
                              {durationMins >= 45 && (
                                <p className="text-[10px] opacity-75 mt-0.5">
                                  {task.scheduledTime}{proj && ` · ${proj.name}`}
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
          task={pendingDrop.task}
          fromDate={pendingDrop.fromDate}
          toDate={pendingDrop.toDate}
          onClose={() => setPendingDrop(null)}
        />
      )}
    </>
  );
}
