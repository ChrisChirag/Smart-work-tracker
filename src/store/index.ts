import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import { generateId } from "@/lib/utils";
import { toast } from "@/store/toast";
import { fillDaySchedule } from "@/lib/schedule";
import type { Task, Project, Tag, TaskStatus } from "@/lib/types";

type BufferMinutes = 0 | 5 | 10 | 15;

interface Store {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  isLoaded: boolean;
  bufferMinutes: BufferMinutes;

  setData: (data: { tasks: Task[]; projects: Project[]; tags: Tag[] }) => void;
  setBufferMinutes: (minutes: BufferMinutes) => void;

  // Task actions
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  rescheduleOverdue: () => void;

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

// Tracks in-flight project POSTs so addTask can await them before inserting,
// preventing the FK violation "tasks_project_id_fkey".
const pendingProjectSyncs = new Map<string, Promise<void>>();

async function readError(res: Response, label: string): Promise<string> {
  try {
    const body = await res.json() as { error?: string };
    return body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function syncTask(method: string, id: string, body?: unknown) {
  return fetch(`/api/tasks${id ? `/${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (res) => {
    if (!res.ok) throw new Error(await readError(res, "task"));
  }).catch((err: Error) => {
    console.error("[syncTask]", method, id || "(new)", err.message);
    toast.error(`Save failed: ${err.message}`);
  });
}

function syncProject(method: string, id: string, body?: unknown) {
  return fetch(`/api/projects${id ? `/${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (res) => {
    if (!res.ok) throw new Error(await readError(res, "project"));
  }).catch((err: Error) => {
    console.error("[syncProject]", method, id || "(new)", err.message);
    toast.error(`Save failed: ${err.message}`);
  });
}

function syncTag(method: string, id: string, body?: unknown) {
  return fetch(`/api/tags${id ? `/${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (res) => {
    if (!res.ok) throw new Error(await readError(res, "tag"));
  }).catch((err: Error) => {
    console.error("[syncTag]", method, id || "(new)", err.message);
    toast.error(`Save failed: ${err.message}`);
  });
}

// Apply day rebalance to a task list and fire PATCH syncs. Returns updated task list.
function applyDayRebalance(
  tasks: Task[],
  date: string,
  bufferMinutes: number = 0
): { tasks: Task[]; assignments: ScheduleAssignment[] } {
  const dayTasks = tasks.filter((t) => t.scheduledDate === date && t.status !== "done");
  const assignments = fillDaySchedule(dayTasks, date, bufferMinutes);
  if (!assignments.length) return { tasks, assignments: [] };

  const updated = tasks.map((t) => {
    const a = assignments.find((x) => x.taskId === t.id);
    return a ? { ...t, scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime, updatedAt: new Date().toISOString() } : t;
  });
  return { tasks: updated, assignments };
}

type ScheduleAssignment = { taskId: string; scheduledDate: string; scheduledTime: string };

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      tags: [],
      isLoaded: false,
      bufferMinutes: 0,

      setData: ({ tasks: serverTasks, projects: serverProjects, tags: serverTags }) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const bufferMins = get().bufferMinutes;

        // Merge: keep locally-created items that haven't been persisted to Supabase yet.
        // This prevents data loss when setData is called (initial load, or after a store reset)
        // while optimistic adds are still in-flight.
        const currentTasks = get().tasks;
        const currentProjects = get().projects;
        const currentTags = get().tags;

        const serverTaskIds = new Set(serverTasks.map((t) => t.id));
        const serverProjectIds = new Set(serverProjects.map((p) => p.id));
        const serverTagIds = new Set(serverTags.map((t) => t.id));

        const allTasks = [
          ...serverTasks,
          ...currentTasks.filter((t) => !serverTaskIds.has(t.id)),
        ];
        const allProjects = [
          ...serverProjects,
          ...currentProjects.filter((p) => !serverProjectIds.has(p.id)),
        ];
        const allTags = [
          ...serverTags,
          ...currentTags.filter((t) => !serverTagIds.has(t.id)),
        ];

        // Items in localStorage that the server has never seen — need to be POSTed.
        const localOnlyProjects = allProjects.filter((p) => !serverProjectIds.has(p.id));
        const localOnlyTaskIds = new Set(
          currentTasks.filter((t) => !serverTaskIds.has(t.id)).map((t) => t.id)
        );

        // Rollover: move past unfinished scheduled tasks to today
        const rolledOverIds: string[] = [];
        const withRollover = allTasks.map((t) => {
          if (t.scheduledDate && t.scheduledDate < today && t.status !== "done") {
            rolledOverIds.push(t.id);
            return { ...t, scheduledDate: today, scheduledTime: undefined, pinnedTime: false };
          }
          return t;
        });

        // Rebalance today after rollover
        const { tasks: rebalanced, assignments } = applyDayRebalance(withRollover, today, bufferMins);

        // Re-sync local-only items to Supabase. Projects must be inserted before tasks
        // to satisfy the FK constraint (tasks_project_id_fkey).
        const localOnlyTasksToSync = rebalanced.filter((t) => localOnlyTaskIds.has(t.id));
        if (localOnlyProjects.length > 0 || localOnlyTasksToSync.length > 0) {
          setTimeout(async () => {
            if (localOnlyProjects.length > 0) {
              await Promise.all(localOnlyProjects.map((p) => syncProject("POST", "", p)));
            }
            for (const t of localOnlyTasksToSync) {
              await syncTask("POST", "", t);
            }
          }, 600);
        }

        if (rolledOverIds.length > 0) {
          setTimeout(() => {
            for (const id of rolledOverIds) {
              syncTask("PATCH", id, { scheduledDate: today, scheduledTime: undefined, pinnedTime: false });
            }
            for (const a of assignments) {
              syncTask("PATCH", a.taskId, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
            }
            toast.success(
              `${rolledOverIds.length} unfinished task${rolledOverIds.length > 1 ? "s" : ""} rolled over to today`
            );
          }, 500);
        }

        set({ tasks: rebalanced, projects: allProjects, tags: allTags, isLoaded: true });
      },

      setBufferMinutes: (minutes) => {
        set({ bufferMinutes: minutes });
        // Rebalance today with new buffer
        const today = format(new Date(), "yyyy-MM-dd");
        set((s) => {
          const { tasks: rebalanced, assignments } = applyDayRebalance(s.tasks, today, minutes);
          setTimeout(() => {
            for (const a of assignments) {
              syncTask("PATCH", a.taskId, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
            }
          }, 0);
          return { tasks: rebalanced };
        });
      },

      addTask: (taskData) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const scheduledDate = taskData.scheduledDate ?? today;

        const task: Task = {
          ...taskData,
          scheduledDate,
          // Preserve explicitly chosen time (pinnedTime); clear it otherwise so rebalance assigns it
          scheduledTime: taskData.pinnedTime ? taskData.scheduledTime : undefined,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((s) => {
          const withNew = [task, ...s.tasks];
          const { tasks: rebalanced, assignments } = applyDayRebalance(withNew, scheduledDate, s.bufferMinutes);
          setTimeout(async () => {
            // If the task references a project that was just created, wait for
            // that project's INSERT to complete first to avoid the FK violation.
            if (task.projectId) {
              const pending = pendingProjectSyncs.get(task.projectId);
              if (pending) await pending;
            }
            // Merge the rebalanced scheduled time into the POST body so no separate PATCH is needed,
            // avoiding a race condition where the PATCH arrives at Supabase before the INSERT completes.
            const ownAssignment = assignments.find((a) => a.taskId === task.id);
            const taskToPost = ownAssignment
              ? { ...task, scheduledDate: ownAssignment.scheduledDate, scheduledTime: ownAssignment.scheduledTime }
              : task;
            syncTask("POST", "", taskToPost);
            for (const a of assignments) {
              if (a.taskId !== task.id) {
                syncTask("PATCH", a.taskId, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
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

          const shouldRebalance =
            "priority" in updates || "scheduledDate" in updates ||
            "status" in updates || "pinnedTime" in updates ||
            "scheduledTime" in updates || "estimatedMinutes" in updates;

          if (!shouldRebalance) {
            setTimeout(() => syncTask("PATCH", id, updates), 0);
            return { tasks: updated };
          }

          const newTask = updated.find((t) => t.id === id);
          const newDate = newTask?.scheduledDate;

          let finalTasks = updated;
          const allAssignments: ScheduleAssignment[] = [];

          if (newDate) {
            const { tasks: r1, assignments: a1 } = applyDayRebalance(finalTasks, newDate, s.bufferMinutes);
            finalTasks = r1;
            allAssignments.push(...a1);
          }
          if (oldDate && oldDate !== newDate) {
            const { tasks: r2, assignments: a2 } = applyDayRebalance(finalTasks, oldDate, s.bufferMinutes);
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
          const { tasks: rebalanced, assignments } = applyDayRebalance(without, date, s.bufferMinutes);
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

      rescheduleOverdue: () => {
        const today = format(new Date(), "yyyy-MM-dd");
        set((s) => {
          const overdue = s.tasks.filter(
            (t) => t.dueDate && t.dueDate < today && t.status !== "done"
          );
          if (overdue.length === 0) {
            toast.success("No overdue tasks to reschedule");
            return s;
          }
          const overdueIds = new Set(overdue.map((t) => t.id));
          const updated = s.tasks.map((t) =>
            overdueIds.has(t.id)
              ? { ...t, scheduledDate: today, scheduledTime: undefined, pinnedTime: false, updatedAt: new Date().toISOString() }
              : t
          );
          const { tasks: rebalanced, assignments } = applyDayRebalance(updated, today, s.bufferMinutes);
          setTimeout(() => {
            for (const t of overdue) {
              syncTask("PATCH", t.id, { scheduledDate: today, scheduledTime: undefined, pinnedTime: false });
            }
            for (const a of assignments) {
              if (!overdueIds.has(a.taskId)) {
                syncTask("PATCH", a.taskId, { scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime });
              }
            }
            toast.success(`${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} scheduled for today`);
          }, 0);
          return { tasks: rebalanced };
        });
      },

      addProject: (projectData) => {
        const project: Project = {
          ...projectData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        // Register the promise so addTask can await it before linking this project.
        const syncPromise = syncProject("POST", "", project).finally(() => {
          pendingProjectSyncs.delete(project.id);
        });
        pendingProjectSyncs.set(project.id, syncPromise);
        toast.success("Project created");
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
    }),
    {
      name: "work-tracker-store",
      // Persist tasks/projects/tags/bufferMinutes to localStorage.
      // isLoaded is intentionally excluded so the app always re-fetches from
      // Supabase on page load, while keeping locally-created data safe.
      partialize: (state) => ({
        tasks: state.tasks,
        projects: state.projects,
        tags: state.tags,
        bufferMinutes: state.bufferMinutes,
      }),
      onRehydrateStorage: () => (state) => {
        // Always re-fetch from Supabase after rehydration, but keep local data
        // so setData's merge logic can preserve anything not yet on the server.
        if (state) state.isLoaded = false;
      },
    }
  )
);
