"use server";

import { changeMemberRoleSchema, createProjectSchema, inviteMemberSchema } from "@relay/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiRequest } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { ZodError } from "zod";

function value(formData: FormData, name: string): string {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function message(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return error.message || "This user does not exist. No Relay account was found for this email.";
    }
    return error.message;
  }
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Invalid input provided.";
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      return "Could not connect to the API server. Please ensure the backend is running.";
    }
    if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("does not exist")) {
      return "This user does not exist. No Relay account was found for this email.";
    }
    return msg;
  }
  return "The request could not be completed.";
}

export async function createProjectAction(formData: FormData): Promise<never> {
  let projectId: string;
  try {
    const input = createProjectSchema.parse({
      name: value(formData, "name"),
      description: value(formData, "description") || null,
    });
    const project = await apiRequest<{ id: string }>("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
    projectId = project.id;
  } catch (error) {
    redirect(`/projects?error=${encodeURIComponent(message(error))}`);
  }
  redirect(`/projects/${projectId}/board`);
}

export async function inviteMemberAction(projectId: string, formData: FormData): Promise<never> {
  try {
    const input = inviteMemberSchema.parse({
      email: value(formData, "email"),
      role: value(formData, "role"),
    });

    // Enforce that only project owner or admin can add members
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }

    const { data: member } = await supabase
      .from("memberships")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new ApiError("Only project owners and admins can add members.", 403);
    }

    await apiRequest(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    redirect(`/projects/${projectId}/members?error=${encodeURIComponent(message(error))}`);
  }
  redirect(`/projects/${projectId}/members?message=Member%20added`);
}

export async function changeRoleAction(
  projectId: string,
  userId: string,
  formData: FormData,
): Promise<never> {
  try {
    const input = changeMemberRoleSchema.parse({ role: value(formData, "role") });
    await apiRequest(`/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    redirect(`/projects/${projectId}/members?error=${encodeURIComponent(message(error))}`);
  }
  redirect(`/projects/${projectId}/members?message=Role%20updated`);
}

export async function removeMemberAction(projectId: string, userId: string): Promise<never> {
  try {
    await apiRequest(`/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    redirect(`/projects/${projectId}/members?error=${encodeURIComponent(message(error))}`);
  }
  redirect(`/projects/${projectId}/members?message=Member%20removed`);
}
