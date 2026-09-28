import type { Task, TaskPriority, TaskStatus } from "@relay/shared";
import { throwDatabaseError } from "../lib/database-error.js";
import { AppError } from "../lib/errors.js";
import { callRpc, getSupabaseAdmin } from "../lib/supabase-admin.js";
import type { TaskDbRow } from "../types/database.js";

interface TaskInput {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  position: number;
}

export function mapTask(row: TaskDbRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    createdBy: row.created_by,
    completedBy: row.completed_by,
    completedAt: row.completed_at,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTask(projectId: string, taskId: string): Promise<Task> {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .select<string, TaskDbRow>("*")
    .eq("id", taskId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  if (!data) throw new AppError(404, "NOT_FOUND", "Task not found.");
  return mapTask(data);
}

export async function createTask(projectId: string, input: TaskInput, actorId: string): Promise<Task> {
  let result = await callRpc<TaskDbRow>("create_task", {
    p_project_id: projectId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_priority: input.priority,
    p_assignee_id: input.assigneeId ?? null,
    p_due_date: input.dueDate ?? null,
    p_position: input.position,
    p_actor_id: actorId,
  });

  if (result.error && (result.error as { code?: string }).code === "PGRST202") {
    result = await callRpc<TaskDbRow>("create_task", {
      p_project_id: projectId,
      p_title: input.title,
      p_description: input.description ?? null,
      p_priority: input.priority,
      p_assignee_id: input.assigneeId ?? null,
      p_position: input.position,
      p_actor_id: actorId,
    });
  }

  if (result.error) throwDatabaseError(result.error);
  if (!result.data) throw new AppError(500, "INTERNAL_ERROR", "Failed to create task.");
  return mapTask(result.data);
}

export async function updateTask(
  current: Task,
  input: Partial<Omit<TaskInput, "position">>,
  actorId: string,
): Promise<Task> {
  let result = await callRpc<TaskDbRow>("update_task", {
    p_task_id: current.id,
    p_title: input.title ?? current.title,
    p_description: input.description === undefined ? current.description : input.description,
    p_priority: input.priority ?? current.priority,
    p_assignee_id: input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
    p_due_date: input.dueDate === undefined ? current.dueDate : input.dueDate,
    p_actor_id: actorId,
  });

  if (result.error && (result.error as { code?: string }).code === "PGRST202") {
    result = await callRpc<TaskDbRow>("update_task", {
      p_task_id: current.id,
      p_title: input.title ?? current.title,
      p_description: input.description === undefined ? current.description : input.description,
      p_priority: input.priority ?? current.priority,
      p_assignee_id: input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
      p_actor_id: actorId,
    });
  }

  if (result.error) throwDatabaseError(result.error);
  if (!result.data) throw new AppError(500, "INTERNAL_ERROR", "Failed to update task.");
  return mapTask(result.data);
}

export async function changeTaskStatus(
  taskId: string,
  status: TaskStatus,
  position: number,
  actorId: string,
): Promise<Task> {
  const { data, error } = await callRpc<TaskDbRow>("change_task_status", {
    p_task_id: taskId,
    p_status: status,
    p_position: position,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  if (!data) throw new AppError(500, "INTERNAL_ERROR", "Failed to update task status.");
  return mapTask(data);
}

export async function deleteTask(taskId: string, actorId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("delete_task", {
    p_task_id: taskId,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
}

export { getProjectSnapshot } from "./projects.js";

