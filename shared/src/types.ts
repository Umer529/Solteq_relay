import type { ProjectRole } from "./permissions.js";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
}

export interface Membership {
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  profile: Profile;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  createdBy: string;
  completedBy: string | null;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  projectId: string;
  actorId: string | null;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Message {
  id: string;
  projectId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export interface ProjectSnapshot {
  project: Project;
  members: Membership[];
  tasks: Task[];
  progress: { total: number; done: number };
  contributions: Array<{ projectId: string; userId: string; completed: number }>;
  activity: ActivityEntry[];
  messages: Message[];
}
