import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import type { Priority, TaskStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy 'at' h:mm a");
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr));
}

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  low: {
    label: "Low",
    color: "text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-300 dark:border-slate-600",
    dot: "bg-slate-400",
  },
  medium: {
    label: "Medium",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-300 dark:border-blue-700",
    dot: "bg-blue-500",
  },
  high: {
    label: "High",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950",
    border: "border-orange-300 dark:border-orange-700",
    dot: "bg-orange-500",
  },
  urgent: {
    label: "Urgent",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-300 dark:border-red-700",
    dot: "bg-red-500",
  },
};

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string }
> = {
  todo: {
    label: "To Do",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
  },
  in_progress: {
    label: "In Progress",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950",
  },
  done: {
    label: "Done",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950",
  },
};

export const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
];

export const PROJECT_EMOJIS = [
  "🚀", "💼", "🎯", "📱", "🌐", "🔧", "💡", "🎨",
  "📊", "🏗️", "⚡", "🔬", "📚", "🎵", "🌱",
];

export const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b",
];
