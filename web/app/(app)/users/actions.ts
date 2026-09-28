"use server";

import { createUserSchema } from "@relay/shared";
import { revalidatePath } from "next/cache";
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
    return error.issues[0]?.message ?? "Invalid form input.";
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      return "Could not connect to the API server. Please ensure the backend is running.";
    }
    return msg;
  }
  return "Could not create user account.";
}

export async function createUserAction(formData: FormData): Promise<never> {
  try {
    const input = createUserSchema.parse({
      displayName: value(formData, "displayName"),
      email: value(formData, "email"),
      password: value(formData, "password"),
      projectId: value(formData, "projectId") || undefined,
      role: value(formData, "role") || undefined,
    });

    await apiRequest("/users", {
      method: "POST",
      body: JSON.stringify(input),
    });

    revalidatePath("/users");
  } catch (error) {
    redirect(`/users?error=${encodeURIComponent(message(error))}`);
  }

  redirect("/users?message=User%20account%20successfully%20created");
}
