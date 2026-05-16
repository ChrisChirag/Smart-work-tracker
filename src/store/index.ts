import { create } from "zustand";
import { format } from "date-fns";
import { generateId } from "@/lib/utils";
import { toast } from "@/store/toast";
import { fillDaySchedule } from "@/lib/schedule";
import type { Task, Project, Tag, TaskStatus } from "@/lib/types";

interface Store {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  isLoaded: boolean;

  setData: (data: { tasks: Task[]; projects: Project[]; tags: Tag[] }) => void;

  // Task actions
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;

  // Project actions
  addProject: (project: Omit<Project, "id" | "createdAt">) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tag actions
  addTag: (tag: Omit<Tag, "id">) => Tag;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;

  // Scheduling
  batchScheduleTasks: (assignments: Array<{ taskId: string; scheduledDate: string; scheduledTime: string }>) => void;

  // Helpers
  getTasksByProject: (projectId: string) => Task[];
  getTasksByDate: (date: string) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getOverdueTasks: () => Task[];
}

function syncTask(method: string, id: string, body?: unknown) {
  return fetch(`/api/tasks${id ? `/${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch((err) => {
    console.error(err);
    toast.error("Sync failed — your data may not have saved");
  });
}

function syncProject(method: string, id: string, body?: unknown) {
  return fetch(`/api/projects${id ? `/${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch((err) => {
    console.error(err);
    toast.error("Sync failed — your data may not have saved");
  });
}

function syncTag(method: string, id: string, body?: unknown) {
  return fetch(`/api/tags${id ? `/${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch((err) => {
    console.error(err);
    toast.error("Sync failed — your data may not have saved");
  });
}

// Apply day rebalance to a task list and fire PATCH syncs. Returns updated task list.
function applyDayRebalance(tasks: Task[], date: string): { tasks: Task[]; assignments: ScheduleAssignment[] } {
  const dayTasks = tasks.filter((t) => t.scheduledDate === date && t.status !== "done");
  const assignments = fillDaySchedule(dayTasks, date);
  if (!assignments.length) return { tasks, assignments: [] };

  const updated = tasks.map((t) => {
    const a = assignments.find((x) => x.taskId === t.id);
    return a ? { ...t, scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime, updatedAt: new Date().toISOString() } : t;
  });
  return { tasks: updated, assignments };
}

type ScheduleAssignment = { taskId: string; scheduledDate: string; scheduledTime: string };

export const useStore = create<Store>()((set, get) => ({
  tasks: [],
  projects: [],
  tags: [],
  isLoaded: false,

  setData: ({ tasks, projects, tags }) => {
    set({ tasks, projects, tags, isLoaded: true });
  },

  addTask: (taskData) => {
    const today = format(new Date(), "yyyy-MM-dd");
    // Always assign a scheduled date — default to today
    const scheduledDate = taskData.scheduledDate ?? today;

    const task: Task = {
      ...taskData,
      scheduledDate,
      scheduledTime: undefined, // will be set by rebalance
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add task then rebalance the whole day in one state update
    set((s) => {
      const withNew = [task, ...s.tasks];
      const { tasks: rebalanced, assignments } = applyDayRebalance(withNew, scheduledDate);
      // Fire syncs after state settles
      setTimeout(() => {
        syncTask("POST", "", task);
        for (const a of assignments) {
          if (a.taskId !== task.id) {
            syncTask("PATCH", a.taskId, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
          } else {
            // For the new task, the POST body will lack the time; send a follow-up PATCH
            syncTask("PATCH", task.id, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
          }
        }
      }, 0);
      return { tasks: rebalanced };
    });

    toast.success("Task added");
    return task;
  },

  updateTask: (id, updates) => {
    set((s) => {
      const oldTask = s.tasks.find((t) => t.id === id);
      const oldDate = oldTask?.scheduledDate;

      const updated = s.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );

      const shouldRebalance = "priority" in updates || "scheduledDate" in updates || "status" in updates;
      if (!shouldRebalance) {
        setTimeout(() => syncTask("PATCH", id, updates), 0);
        return { tasks: updated };
      }

      const newTask = updated.find((t) => t.id === id);
      const newDate = newTask?.scheduledDate;

      let finalTasks = updated;
      const allAssignments: Array<{ taskId: string; scheduledDate: string; scheduledTime: string }> = [];

      if (newDate) {
        const { tasks: r1, assignments: a1 } = applyDayRebalance(finalTasks, newDate);
        finalTasks = r1;
        allAssignments.push(...a1);
      }
      // When date changed, rebalance the vacated day too
      if (oldDate && oldDate !== newDate) {
        const { tasks: r2, assignments: a2 } = applyDayRebalance(finalTasks, oldDate);
        finalTasks = r2;
        allAssignments.push(...a2);
      }

      setTimeout(() => {
        syncTask("PATCH", id, updates);
        for (const a of allAssignments) {
          if (a.taskId !== id) {
            syncTask("PATCH", a.taskId, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
          }
        }
      }, 0);
      return { tasks: finalTasks };
    });
  },

  deleteTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    const date = task?.scheduledDate;

    set((s) => {
      const without = s.tasks.filter((t) => t.id !== id);
      if (!date) {
        setTimeout(() => { syncTask("DELETE", id); }, 0);
        return { tasks: without };
      }
      const { tasks: rebalanced, assignments } = applyDayRebalance(without, date);
      setTimeout(() => {
        syncTask("DELETE", id);
        for (const a of assignments) {
          syncTask("PATCH", a.taskId, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
        }
      }, 0);
      return { tasks: rebalanced };
    });

    toast.success("Task deleted");
  },

  toggleTaskStatus: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const next: TaskStatus =
      task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done";
    const updates: Partial<Task> = {
      status: next,
      completedAt: next === "done" ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
    // Reuse updateTask so it handles rebalancing (done tasks are excluded from the day)
    get().updateTask(id, updates);
  },

  setTaskStatus: (id, status) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    const updates: Partial<Task> = {
      status,
      completedAt: status === "done" ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
    get().updateTask(id, updates);
  },

  addProject: (projectData) => {
    const project: Project = {
      ...projectData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    toast.success("Project created");
    set((s) => ({ projects: [project, ...s.projects] }));
    syncProject("POST", "", project);
    return project;
  },

  updateProject: (id, updates) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    syncProject("PATCH", id, updates);
  },

  deleteProject: (id) => {
    toast.success("Project deleted");
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
    }));
    syncProject("DELETE", id);
  },

  addTag: (tagData) => {
    const tag: Tag = { ...tagData, id: generateId() };
    toast.success("Tag created");
    set((s) => ({ tags: [...s.tags, tag] }));
    syncTag("POST", "", tag);
    return tag;
  },

  updateTag: (id, updates) => {
    set((s) => ({
      tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteTag: (id) => {
    toast.success("Tag deleted");
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      tasks: s.tasks.map((t) => ({ ...t, tagIds: t.tagIds.filter((tid) => tid !== id) })),
    }));
    syncTag("DELETE", id);
  },

  batchScheduleTasks: (assignments) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        const a = assignments.find((x) => x.taskId === t.id);
        return a ? { ...t, scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime, updatedAt: new Date().toISOString() } : t;
      }),
    }));
    for (const a of assignments) {
      syncTask("PATCH", a.taskId, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
    }
    toast.success(`${assignments.length} task${assignments.length !== 1 ? "s" : ""} scheduled`);
  },

  getTasksByProject: (projectId) => get().tasks.filter((t) => t.projectId === projectId),
  getTasksByDate: (date) => get().tasks.filter((t) => t.scheduledDate === date),
  getTasksByStatus: (status) => get().tasks.filter((t) => t.status === status),
  getOverdueTasks: () => {
    const today = format(new Date(), "yyyy-MM-dd");
    return get().tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== "done");
  },
}));
