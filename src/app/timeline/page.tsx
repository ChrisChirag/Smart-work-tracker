"use client";

import React, { useState } from "react";
import {
  format, addDays, subDays, parseISO, isToday, isSameDay,
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

type ViewMode = "day" | "week";

export default function TimelinePage() {
  const { tasks } = useStore();
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

  // Get days for week view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Tasks for a given day
  const getTasksForDay = (dateStr: string) =>
    tasks.filter((t) => t.scheduledDate === dateStr);

  const dayTasks = getTasksForDay(selectedStr);

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
            <Button variant="outline" size="sm" className="h-8" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
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

            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Week view */}
        {viewMode === "week" && (
          <div className="space-y-4">
            {/* Mini calendar strip */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayTasks = getTasksForDay(dayStr);
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
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5">
                        {dayTasks.slice(0, 3).map((t, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1 w-1 rounded-full",
                              isSelected ? "bg-primary-foreground/70" : "bg-primary"
                            )}
                          />
                        ))}
                      </div>
                    )}
                    {dayTasks.length === 0 && <div className="h-2" />}
                  </button>
                );
              })}
            </div>

            {/* Day columns — horizontal scroll on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const colTasks = getTasksForDay(dayStr);
                const today = isToday(day);

                return (
                  <div key={dayStr} className={cn("md:min-h-[200px]", !today && "hidden md:block")}>
                    <div
                      className={cn(
                        "text-xs font-semibold mb-2 text-center",
                        today ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {today ? "Today" : format(day, "EEE d")}
                    </div>
                    <div className="space-y-1.5 rounded-xl bg-muted/30 p-2 min-h-[80px]">
                      {colTasks.length === 0 ? (
                        <button
                          className="w-full h-16 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          onClick={() => {
                            setSelectedDate(day);
                            setAddOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : (
                        colTasks.map((t) => <TaskCard key={t.id} task={t} compact />)
                      )}
                    </div>
                  </div>
                );
              })}
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
                  {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                </span>
              </h2>
            </div>

            {dayTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed py-16 text-center space-y-3">
                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled for this day
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddOpen(true)}
                  className="gap-1.5"
                >
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
