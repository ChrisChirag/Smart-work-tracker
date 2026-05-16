import type { Task, Priority } from "./types";
import { differenceInCalendarDays, parseISO } from "date-fns";

const WORK_START  = 9  * 60;  // 9:00 AM
const WORK_END    = 18 * 60;  // 6:00 PM
const LUNCH_START = 12 * 60;  // 12:00 PM
const LUNCH_END   = 13 * 60;  // 1:00 PM
const AVAIL_MINS  = WORK_END - WORK_START - (LUNCH_END - LUNCH_START); // 480 min

const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];
const PRIORITY_WEIGHT: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

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

// Advance past the lunch window if we've landed in it.
function skipLunch(mins: number): number {
  return mins >= LUNCH_START && mins < LUNCH_END ? LUNCH_END : mins;
}

// ─── Primary: fill the whole 9-6 day proportionally ──────────────────────────
// Sorts tasks by priority (urgent first), divides 480 available minutes
// weighted by priority, then assigns consecutive start times 9 AM → 6 PM
// with a 12-1 PM lunch gap automatically skipped.
export function fillDaySchedule(tasks: Task[], date: string): ScheduleAssignment[] {
  const active = tasks.filter((t) => t.status !== "done");
  if (active.length === 0) return [];

  // Sort: urgent → high → medium → low
  const sorted = [...active].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  );

  const totalWeight = sorted.reduce((s, t) => s + PRIORITY_WEIGHT[t.priority], 0);

  // Each task's raw allocation, minimum 30 min
  const MIN_SLOT = 30;
  const durations = sorted.map((t) =>
    Math.max(MIN_SLOT, Math.round((PRIORITY_WEIGHT[t.priority] / totalWeight) * AVAIL_MINS))
  );

  // If minimum enforcement pushes total over AVAIL_MINS, trim the lowest-priority tasks
  let total = durations.reduce((a, b) => a + b, 0);
  for (let i = durations.length - 1; i >= 0 && total > AVAIL_MINS; i--) {
    const excess = total - AVAIL_MINS;
    const trim   = Math.min(excess, durations[i] - MIN_SLOT);
    if (trim > 0) { durations[i] -= trim; total -= trim; }
  }

  const assignments: ScheduleAssignment[] = [];
  let cursor = WORK_START;

  for (let i = 0; i < sorted.length; i++) {
    cursor = skipLunch(cursor);
    if (cursor >= WORK_END) break;

    assignments.push({
      taskId: sorted[i].id,
      scheduledDate: date,
      scheduledTime: minsToTime(cursor),
    });

    cursor += durations[i];
    // If we've advanced into lunch, jump to 1 PM so the next task starts there
    if (cursor > LUNCH_START && cursor <= LUNCH_END) cursor = LUNCH_END;
  }

  return assignments;
}

// ─── Secondary: pick one slot for the auto-schedule preview dialog ────────────
// Used by the timeline "Auto-schedule" button to find a slot for unscheduled
// tasks without a fixed day assignment.
const PRIORITY_START: Record<Priority, number> = {
  urgent: 9 * 60, high: 10 * 60, medium: 14 * 60, low: 16 * 60,
};
const PRIORITY_SLOTS: Record<Priority, number> = { urgent: 2, high: 2, medium: 1, low: 1 };
const PRIORITY_SCORE: Record<Priority, number>  = { urgent: 1000, high: 100, medium: 10, low: 1 };

function scoreSingle(task: Task, date: string): number {
  let s = PRIORITY_SCORE[task.priority];
  if (task.dueDate) {
    const days = differenceInCalendarDays(parseISO(task.dueDate), parseISO(date));
    if (days <= 0) s += 500;
    else if (days === 1) s += 200;
    else if (days <= 3) s += 50;
  }
  return s;
}

function buildFreeSlots(occupied: Set<number>): number[] {
  const slots: number[] = [];
  for (let m = WORK_START; m + 30 <= WORK_END; m += 30) {
    if (m >= LUNCH_START && m < LUNCH_END) continue;
    if (!occupied.has(m)) slots.push(m);
  }
  return slots;
}

function closestSlot(preferred: number, free: number[]): number | null {
  if (!free.length) return null;
  return free.reduce((b, s) => Math.abs(s - preferred) < Math.abs(b - preferred) ? s : b);
}

export function autoSchedule(candidates: Task[], alreadyScheduled: Task[], date: string): ScheduleResult {
  const occupied = new Set<number>(
    alreadyScheduled
      .filter((t) => t.scheduledTime)
      .map((t) => { const [h, m] = t.scheduledTime!.split(":").map(Number); return h * 60 + m; })
  );

  const sorted = [...candidates].sort((a, b) => scoreSingle(b, date) - scoreSingle(a, date));
  const assignments: ScheduleAssignment[] = [];
  const unscheduled: Task[] = [];

  for (const task of sorted) {
    const free = buildFreeSlots(occupied);
    const needed = PRIORITY_SLOTS[task.priority];
    if (free.length < needed) { unscheduled.push(task); continue; }

    const start = closestSlot(PRIORITY_START[task.priority], free);
    if (start === null) { unscheduled.push(task); continue; }

    for (let i = 0; i < needed; i++) occupied.add(start + i * 30);
    assignments.push({ taskId: task.id, scheduledDate: date, scheduledTime: minsToTime(start) });
  }

  return { assignments, unscheduled };
}
