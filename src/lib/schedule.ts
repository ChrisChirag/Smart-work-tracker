import type { Task, Priority } from "./types";
import { differenceInCalendarDays, parseISO } from "date-fns";

const WORK_START = 9 * 60;  // 9:00 AM
const WORK_END = 19 * 60;   // 7:00 PM
const LUNCH_START = 12 * 60;
const LUNCH_END = 13 * 60;
const SLOT = 30;

// Preferred start time (minutes from midnight) per priority
const PRIORITY_START: Record<Priority, number> = {
  urgent: 9 * 60,
  high: 10 * 60,
  medium: 14 * 60,
  low: 16 * 60,
};

// Slots (30-min blocks) allocated per priority level
const PRIORITY_SLOTS: Record<Priority, number> = {
  urgent: 2,
  high: 2,
  medium: 1,
  low: 1,
};

// Higher = scheduled earlier
const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 1000,
  high: 100,
  medium: 10,
  low: 1,
};

export interface ScheduleAssignment {
  taskId: string;
  scheduledDate: string;
  scheduledTime: string;
}

export interface ScheduleResult {
  assignments: ScheduleAssignment[];
  unscheduled: Task[];
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function score(task: Task, date: string): number {
  let s = PRIORITY_WEIGHT[task.priority];
  if (task.dueDate) {
    const days = differenceInCalendarDays(parseISO(task.dueDate), parseISO(date));
    if (days <= 0) s += 500;       // overdue
    else if (days === 1) s += 200; // due tomorrow
    else if (days <= 3) s += 50;   // due soon
  }
  return s;
}

function buildFreeSlots(existingTimes: Set<number>): number[] {
  const slots: number[] = [];
  let m = WORK_START;
  while (m + SLOT <= WORK_END) {
    if (!(m >= LUNCH_START && m < LUNCH_END) && !existingTimes.has(m)) {
      slots.push(m);
    }
    m += SLOT;
  }
  return slots;
}

function closestSlot(preferred: number, free: number[]): number | null {
  if (free.length === 0) return null;
  return free.reduce((best, s) =>
    Math.abs(s - preferred) < Math.abs(best - preferred) ? s : best
  );
}

export function autoSchedule(
  candidates: Task[],
  alreadyScheduled: Task[],
  date: string
): ScheduleResult {
  // Build occupied slot set from tasks already having a time on this date
  const occupiedMins = new Set<number>(
    alreadyScheduled
      .filter((t) => t.scheduledTime)
      .map((t) => {
        const [h, m] = (t.scheduledTime as string).split(":").map(Number);
        return h * 60 + m;
      })
  );

  // Sort candidates by score descending (most critical first)
  const sorted = [...candidates].sort((a, b) => score(b, date) - score(a, date));

  const assignments: ScheduleAssignment[] = [];
  const unscheduled: Task[] = [];

  for (const task of sorted) {
    const preferred = PRIORITY_START[task.priority];
    const slotsNeeded = PRIORITY_SLOTS[task.priority];
    const freeSlots = buildFreeSlots(occupiedMins);

    if (freeSlots.length < slotsNeeded) {
      unscheduled.push(task);
      continue;
    }

    const start = closestSlot(preferred, freeSlots);
    if (start === null) {
      unscheduled.push(task);
      continue;
    }

    // Reserve the slot(s)
    for (let i = 0; i < slotsNeeded; i++) {
      occupiedMins.add(start + i * SLOT);
    }

    assignments.push({
      taskId: task.id,
      scheduledDate: date,
      scheduledTime: minsToTime(start),
    });
  }

  return { assignments, unscheduled };
}
