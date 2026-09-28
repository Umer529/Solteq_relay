"use server";

import { createProjectSchema } from "@relay/shared";
import { redirect } from "next/navigation";
import { ApiError, apiRequest } from "@/lib/api";
import { ZodError } from "zod";

function value(formData: FormData, name: string): string {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function message(error: unknown): string {
  if (error instanceof ApiError) {
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
