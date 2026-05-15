import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import { generateId } from "@/lib/utils";
// format is used in getOverdueTasks
import type { Task, Project, Tag, TaskStatus } from "@/lib/types";

interface Store {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];

  // Task actions
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;

  // Project actions
  addProject: (project: Omit<Project, "id" | "createdAt">) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tag actions
  addTag: (tag: Omit<Tag, "id">) => Tag;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;

  // Helpers
  getTasksByProject: (projectId: string) => Task[];
  getTasksByDate: (date: string) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getOverdueTasks: () => Task[];
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      tags: [],

      addTask: (taskData) => {
        const task: Task = {
          ...taskData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task;
      },

      updateTask: (id, updates) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      toggleTaskStatus: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        const next: TaskStatus =
          task.status === "done"
            ? "todo"
            : task.status === "todo"
            ? "in_progress"
            : "done";
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: next,
                  completedAt: next === "done" ? new Date().toISOString() : undefined,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      },

      addProject: (projectData) => {
        const project: Project = {
          ...projectData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },

      updateProject: (id, updates) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.map((t) =>
            t.projectId === id ? { ...t, projectId: undefined } : t
          ),
        }));
      },

      addTag: (tagData) => {
        const tag: Tag = { ...tagData, id: generateId() };
        set((s) => ({ tags: [...s.tags, tag] }));
        return tag;
      },

      updateTag: (id, updates) => {
        set((s) => ({
          tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTag: (id) => {
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
          tasks: s.tasks.map((t) => ({
            ...t,
            tagIds: t.tagIds.filter((tid) => tid !== id),
          })),
        }));
      },

      getTasksByProject: (projectId) => {
        return get().tasks.filter((t) => t.projectId === projectId);
      },

      getTasksByDate: (date) => {
        return get().tasks.filter((t) => t.scheduledDate === date);
      },

      getTasksByStatus: (status) => {
        return get().tasks.filter((t) => t.status === status);
      },

      getOverdueTasks: () => {
        const today = format(new Date(), "yyyy-MM-dd");
        return get().tasks.filter(
          (t) => t.dueDate && t.dueDate < today && t.status !== "done"
        );
      },
    }),
    {
      name: "smart-work-tracker-v1",
    }
  )
);
