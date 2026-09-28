"use server";

import { changeMemberRoleSchema, createProjectSchema, inviteMemberSchema } from "@relay/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api";

function value(formData: FormData, name: string): string {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
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
  redirect(`/projects/${projectId}/members`);
}

export async function inviteMemberAction(projectId: string, formData: FormData): Promise<never> {
  try {
    const input = inviteMemberSchema.parse({
      email: value(formData, "email"),
      role: value(formData, "role"),
    });
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
