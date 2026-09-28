import type {
  ActivityEntry,
  Membership,
  Message,
  Project,
  ProjectSnapshot,
  Task,
  TaskPriority,
  TaskStatus,
} from "@relay/shared";
import { throwDatabaseError } from "../lib/database-error.js";
import { AppError } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface TaskInput {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  position: number;
}

interface MemberRow {
  project_id: string;
  user_id: string;
  role: Membership["role"];
  created_at: string;
  profiles: { id: string; email: string; display_name: string; avatar_color: string } | null;
}

function mapTask(row: TaskRow): Task {
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
    .select("*")
    .eq("id", taskId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  if (!data) throw new AppError(404, "NOT_FOUND", "Task not found.");
  return mapTask(data as unknown as TaskRow);
}

export async function createTask(projectId: string, input: TaskInput, actorId: string): Promise<Task> {
  const { data, error } = await getSupabaseAdmin().rpc("create_task", {
    p_project_id: projectId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_priority: input.priority,
    p_assignee_id: input.assigneeId ?? null,
    p_due_date: input.dueDate ?? null,
    p_position: input.position,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  return mapTask(data as unknown as TaskRow);
}

export async function updateTask(
  current: Task,
  input: Partial<Omit<TaskInput, "position">>,
  actorId: string,
): Promise<Task> {
  const { data, error } = await getSupabaseAdmin().rpc("update_task", {
    p_task_id: current.id,
    p_title: input.title ?? current.title,
    p_description: input.description === undefined ? current.description : input.description,
    p_priority: input.priority ?? current.priority,
    p_assignee_id: input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
    p_due_date: input.dueDate === undefined ? current.dueDate : input.dueDate,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  return mapTask(data as unknown as TaskRow);
}

export async function changeTaskStatus(
  taskId: string,
  status: TaskStatus,
  position: number,
  actorId: string,
): Promise<Task> {
  const { data, error } = await getSupabaseAdmin().rpc("change_task_status", {
    p_task_id: taskId,
    p_status: status,
    p_position: position,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  return mapTask(data as unknown as TaskRow);
}

export async function deleteTask(taskId: string, actorId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("delete_task", {
    p_task_id: taskId,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
}

export async function getProjectSnapshot(projectId: string): Promise<ProjectSnapshot> {
  const admin = getSupabaseAdmin();
  const [projectResult, membersResult, tasksResult, progressResult, contributionResult, activityResult, messagesResult] =
    await Promise.all([
      admin.from("projects").select("*").eq("id", projectId).maybeSingle(),
      admin
        .from("memberships")
        .select("project_id,user_id,role,created_at,profiles(id,email,display_name,avatar_color)")
        .eq("project_id", projectId)
        .order("created_at"),
      admin.from("tasks").select("*").eq("project_id", projectId).order("position"),
      admin.from("project_progress").select("total,done").eq("project_id", projectId).maybeSingle(),
      admin.from("member_contributions").select("project_id,user_id,completed").eq("project_id", projectId),
      admin.from("activity_log").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50),
      admin.from("messages").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50),
    ]);

  const error = [projectResult, membersResult, tasksResult, progressResult, contributionResult, activityResult, messagesResult]
    .map((result) => result.error)
    .find(Boolean);
  if (error) throwDatabaseError(error);
  if (!projectResult.data) throw new AppError(404, "NOT_FOUND", "Project not found.");

  const projectRow = projectResult.data as unknown as {
    id: string; name: string; description: string | null; created_by: string; created_at: string;
  };
  const project: Project = {
    id: projectRow.id,
    name: projectRow.name,
    description: projectRow.description,
    createdBy: projectRow.created_by,
    createdAt: projectRow.created_at,
  };
  const members = ((membersResult.data ?? []) as unknown as MemberRow[]).flatMap((row) =>
    row.profiles
      ? [{
          projectId: row.project_id,
          userId: row.user_id,
          role: row.role,
          createdAt: row.created_at,
          profile: {
            id: row.profiles.id,
            email: row.profiles.email,
            displayName: row.profiles.display_name,
            avatarColor: row.profiles.avatar_color,
          },
        }]
      : [],
  );
  const activities = (activityResult.data ?? []) as unknown as Array<{
    id: string; project_id: string; actor_id: string | null; type: string; payload: Record<string, unknown>; created_at: string;
  }>;
  const messages = (messagesResult.data ?? []) as unknown as Array<{
    id: string; project_id: string; user_id: string; body: string; edited_at: string | null; created_at: string;
  }>;

  return {
    project,
    members,
    tasks: ((tasksResult.data ?? []) as unknown as TaskRow[]).map(mapTask),
    progress: {
      total: Number(progressResult.data?.total ?? 0),
      done: Number(progressResult.data?.done ?? 0),
    },
    contributions: ((contributionResult.data ?? []) as unknown as Array<{
      project_id: string; user_id: string; completed: number;
    }>).map((row) => ({ projectId: row.project_id, userId: row.user_id, completed: Number(row.completed) })),
    activity: activities.map((row): ActivityEntry => ({
      id: row.id,
      projectId: row.project_id,
      actorId: row.actor_id,
      type: row.type,
      payload: row.payload,
      createdAt: row.created_at,
    })),
    messages: messages.reverse().map((row): Message => ({
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      body: row.body,
      editedAt: row.edited_at,
      createdAt: row.created_at,
    })),
  };
}
