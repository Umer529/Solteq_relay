import type { ProjectSnapshot, Task } from "@relay/shared";
import { createClient } from "@/lib/supabase/browser";

interface ApiErrorBody {
  error?: { message?: string };
}

export async function browserApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.error?.message ?? "The request could not be completed.");
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as { data: T };
  return body.data;
}

export function fetchProjectSnapshot(projectId: string): Promise<ProjectSnapshot> {
  return browserApiRequest(`/projects/${projectId}/snapshot`);
}

export function createTask(projectId: string, input: object): Promise<Task> {
  return browserApiRequest(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTask(projectId: string, taskId: string, input: object): Promise<Task> {
  return browserApiRequest(`/projects/${projectId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function moveTask(
  projectId: string,
  taskId: string,
  input: { status: Task["status"]; position: number },
): Promise<Task> {
  return browserApiRequest(`/projects/${projectId}/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTask(projectId: string, taskId: string): Promise<void> {
  return browserApiRequest(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
}
