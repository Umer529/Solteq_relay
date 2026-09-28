import type { z } from "zod";
import type { ProjectRole } from "./permissions.js";
import type {
  taskStatusSchema,
  taskPrioritySchema,
  createTaskSchema,
  updateTaskSchema,
  changeTaskStatusSchema,
} from "./schemas/tasks.js";
import type { createProjectSchema, updateProjectSchema } from "./schemas/projects.js";
import type { postMessageSchema, editMessageSchema } from "./schemas/messages.js";
import type {
  inviteMemberSchema,
  changeMemberRoleSchema,
  createUserSchema,
} from "./schemas/members.js";

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ChangeTaskStatusInput = z.infer<typeof changeTaskStatusSchema>;
export type PostMessageInput = z.infer<typeof postMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;

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
  dueDate: string | null;
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
  editedAt: string | null;
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
