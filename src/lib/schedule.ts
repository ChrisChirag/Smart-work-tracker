import type { Task, Priority } from "./types";
import { differenceInCalendarDays, parseISO } from "date-fns";

const WORK_START  = 9  * 60;  // 9:00 AM
const WORK_END    = 18 * 60;  // 6:00 PM
const LUNCH_START = 13 * 60;  // 1:00 PM
const LUNCH_END   = 14 * 60;  // 2:00 PM
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

const MIN_SLOT = 30;

// ─── Primary: fill the whole 9-6 day proportionally ──────────────────────────
// Pinned tasks (pinnedTime === true) keep their exact scheduledTime.
// Floating tasks are distributed proportionally in the remaining free slots.
export function fillDaySchedule(tasks: Task[], date: string): ScheduleAssignment[] {
  const active = tasks.filter((t) => t.status !== "done");
  if (active.length === 0) return [];

  const pinned   = active.filter((t) => t.pinnedTime && t.scheduledTime);
  const floating = active.filter((t) => !t.pinnedTime || !t.scheduledTime);

  if (floating.length === 0) return []; // everything is pinned, nothing to move

  // Build occupied-slot set from pinned tasks.
  // Each pinned task "uses" as many MIN_SLOT blocks as its proportional share of the day.
  const totalWeight  = active.reduce((s, t) => s + PRIORITY_WEIGHT[t.priority], 0);
  const getDuration  = (t: Task) =>
    Math.max(MIN_SLOT, Math.round((PRIORITY_WEIGHT[t.priority] / totalWeight) * AVAIL_MINS));

  const occupiedMins = new Set<number>();
  for (const t of pinned) {
    const [h, m] = t.scheduledTime!.split(":").map(Number);
    const start = h * 60 + m;
    const dur   = getDuration(t);
    for (let s = start; s < start + dur; s += MIN_SLOT) occupiedMins.add(s);
  }

  // Build ordered list of free 30-min slots
  const freeSlots: number[] = [];
  for (let m = WORK_START; m + MIN_SLOT <= WORK_END; m += MIN_SLOT) {
    if (m >= LUNCH_START && m < LUNCH_END) continue;
    if (occupiedMins.has(m)) continue;
    freeSlots.push(m);
  }

  // Sort floating tasks: urgent → high → medium → low
  const sorted = [...floating].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  );

  const floatWeight = floating.reduce((s, t) => s + PRIORITY_WEIGHT[t.priority], 0);
  const floatMins   = freeSlots.length * MIN_SLOT;

  const assignments: ScheduleAssignment[] = [];
  let slotIdx = 0;

  for (const task of sorted) {
    if (slotIdx >= freeSlots.length) break;

    const dur       = Math.max(MIN_SLOT, Math.round((PRIORITY_WEIGHT[task.priority] / floatWeight) * floatMins));
    const slotsUsed = Math.max(1, Math.round(dur / MIN_SLOT));

    assignments.push({
      taskId: task.id,
      scheduledDate: date,
      scheduledTime: minsToTime(freeSlots[slotIdx]),
    });

    slotIdx += slotsUsed;
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
