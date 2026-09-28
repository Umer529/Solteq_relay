import type { Membership, Message, ProjectSnapshot, Task } from "@relay/shared";
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

  const configuredUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const candidateUrls = Array.from(
    new Set([
      configuredUrl,
      configuredUrl.includes("localhost")
        ? configuredUrl.replace("localhost", "127.0.0.1")
        : configuredUrl.replace("127.0.0.1", "localhost"),
    ]),
  );

  let response: Response | undefined;
  for (const baseUrl of candidateUrls) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
      break;
    } catch {
      // Try next candidate
    }
  }

  if (!response) {
    throw new Error("Could not connect to the API server. Please ensure the backend service is running.");
  }

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

export function postMessage(projectId: string, body: string): Promise<Message> {
  return browserApiRequest(`/projects/${projectId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function fetchMessages(projectId: string, before: string, limit = 50): Promise<Message[]> {
  const query = new URLSearchParams({ before, limit: String(limit) });
  return browserApiRequest(`/projects/${projectId}/messages?${query.toString()}`);
}

export function editMessage(projectId: string, messageId: string, body: string): Promise<Message> {
  return browserApiRequest(`/projects/${projectId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}

export function deleteMessage(projectId: string, messageId: string): Promise<void> {
  return browserApiRequest(`/projects/${projectId}/messages/${messageId}`, { method: "DELETE" });
}

export function addProjectMember(
  projectId: string,
  input: { email: string; password?: string; role: string; displayName?: string },
): Promise<Membership> {
  return browserApiRequest(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeProjectMemberRole(
  projectId: string,
  userId: string,
  role: string,
): Promise<Membership> {
  return browserApiRequest(`/projects/${projectId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeProjectMember(projectId: string, userId: string): Promise<void> {
  return browserApiRequest(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function createProvisionedUser<T = any>(input: {
  email: string;
  password?: string;
  displayName: string;
  projectId?: string;
  role?: string;
}): Promise<T> {
  return browserApiRequest(`/users`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
