"use client";

import React, { useState } from "react";
import {
  format, addDays, isToday, isSameDay,
  startOfWeek, endOfWeek, eachDayOfInterval,
} from "date-fns";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, LayoutList,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ViewMode = "day" | "week";

export default function TimelinePage() {
  const { tasks, isLoaded } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [addOpen, setAddOpen] = useState(false);

  const selectedStr = format(selectedDate, "yyyy-MM-dd");

  const navigate = (dir: 1 | -1) => {
    setSelectedDate((d) =>
      viewMode === "day" ? addDays(d, dir) : addDays(d, dir * 7)
    );
  };

  const goToday = () => setSelectedDate(new Date());

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getTasksForDay = (dateStr: string) =>
    tasks.filter((t) => t.scheduledDate === dateStr);

  const dayTasks = getTasksForDay(selectedStr);

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
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Timeline"
        subtitle={
          viewMode === "day"
            ? format(selectedDate, "EEEE, MMMM d, yyyy")
            : `Week of ${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
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
            <div className="flex rounded-lg border p-0.5">
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  viewMode === "day"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                Day
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  viewMode === "week"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Week
              </button>
            </div>

            <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>
          </div>
        </div>

        {/* Week view */}
        {viewMode === "week" && (
          <div className="space-y-4">
            {/* Day picker strip */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayTaskCount = getTasksForDay(dayStr).length;
                const isSelected = isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <button
                    key={dayStr}
                    onClick={() => {
                      setSelectedDate(day);
                      setViewMode("day");
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl p-2 transition-all text-center",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : today
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      {format(day, "EEE")}
                    </span>
                    <span className={cn("text-sm font-bold", today && !isSelected && "text-primary")}>
                      {format(day, "d")}
                    </span>
                    {dayTaskCount > 0 ? (
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(dayTaskCount, 3) }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1 w-1 rounded-full",
                              isSelected ? "bg-primary-foreground/70" : "bg-primary"
                            )}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="h-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Day columns — horizontal scroll on mobile */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              <div className="flex gap-3 md:grid md:grid-cols-7 min-w-[560px] md:min-w-0">
                {weekDays.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const colTasks = getTasksForDay(dayStr);
                  const today = isToday(day);
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <div
                      key={dayStr}
                      className={cn(
                        "flex-1 min-w-[100px] md:min-w-0 rounded-xl border transition-all",
                        today ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20",
                        isSelected && "ring-1 ring-primary/30"
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-semibold py-2 px-2 text-center rounded-t-xl",
                          today ? "text-primary bg-primary/10" : "text-muted-foreground"
                        )}
                      >
                        {today ? "Today" : format(day, "EEE d")}
                      </div>
                      <div className="p-1.5 space-y-1.5 min-h-[80px]">
                        {colTasks.length === 0 ? (
                          <button
                            className="w-full h-14 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground/50 hover:border-primary hover:text-primary transition-colors text-xs"
                            onClick={() => {
                              setSelectedDate(day);
                              setAddOpen(true);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <>
                            {colTasks.map((t) => <TaskCard key={t.id} task={t} compact />)}
                            <button
                              className="w-full rounded-lg border border-dashed flex items-center justify-center text-muted-foreground/50 hover:border-primary hover:text-primary transition-colors py-1"
                              onClick={() => {
                                setSelectedDate(day);
                                setAddOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Day view */}
        {viewMode === "day" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE, MMMM d")}
                <span className="ml-2 text-muted-foreground font-normal">
                  · {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                </span>
              </h2>
            </div>

            {dayTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed py-16 text-center space-y-3">
                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/25" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nothing scheduled for this day
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Add a task and set its scheduled date to this day.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Schedule a task
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {dayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                <button
                  className="w-full rounded-xl border border-dashed py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add task for this day
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <TaskForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={selectedStr}
      />
    </>
  );
}
