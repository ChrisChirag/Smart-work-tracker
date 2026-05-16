export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  emoji: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  projectId?: string;
  tagIds: string[];
  dueDate?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  activeView: "dashboard" | "tasks" | "projects" | "timeline";
  selectedProjectId: string | null;
  selectedDate: string;
  theme: "light" | "dark" | "system";
}
