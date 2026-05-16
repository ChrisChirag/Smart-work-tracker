import { create } from "zustand";
import { format } from "date-fns";
import { generateId } from "@/lib/utils";
import type { Task, Project, Tag, TaskStatus } from "@/lib/types";

interface Store {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  isLoaded: boolean;

  // Hydrate from API
  setData: (data: { tasks: Task[]; projects: Project[]; tags: Tag[] }) => void;

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

function syncTask(method: string, id: string, body?: unknown) {
  const url = `/api/tasks${id ? `/${id}` : ""}`;
  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(console.error);
}

function syncProject(method: string, id: string, body?: unknown) {
  fetch(`/api/projects${id ? `/${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(console.error);
}

function syncTag(method: string, id: string, body?: unknown) {
  fetch(`/api/tags${id ? `/${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(console.error);
}

export const useStore = create<Store>()((set, get) => ({
  tasks: [],
  projects: [],
  tags: [],
  isLoaded: false,

  setData: ({ tasks, projects, tags }) => {
    set({ tasks, projects, tags, isLoaded: true });
  },

  addTask: (taskData) => {
    const task: Task = {
      ...taskData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ tasks: [task, ...s.tasks] }));
    syncTask("POST", "", task);
    return task;
  },

  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }));
    syncTask("PATCH", id, updates);
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    syncTask("DELETE", id);
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
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    syncTask("PATCH", id, updates);
  },

  addProject: (projectData) => {
    const project: Project = {
      ...projectData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
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
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
    }));
    syncProject("DELETE", id);
  },

  addTag: (tagData) => {
    const tag: Tag = { ...tagData, id: generateId() };
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
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      tasks: s.tasks.map((t) => ({ ...t, tagIds: t.tagIds.filter((tid) => tid !== id) })),
    }));
    syncTag("DELETE", id);
  },

  getTasksByProject: (projectId) => get().tasks.filter((t) => t.projectId === projectId),
  getTasksByDate: (date) => get().tasks.filter((t) => t.scheduledDate === date),
  getTasksByStatus: (status) => get().tasks.filter((t) => t.status === status),
  getOverdueTasks: () => {
    const today = format(new Date(), "yyyy-MM-dd");
    return get().tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== "done");
  },
}));
