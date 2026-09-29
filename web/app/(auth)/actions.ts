"use server";

import { loginSchema } from "@relay/shared";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function authRedirect(path: string, key: "error" | "message", value: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(value)}`);
}

export async function loginAction(formData: FormData): Promise<never> {
  const result = loginSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!result.success) authRedirect("/login", "error", "Enter a valid email and password.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) authRedirect("/login", "error", "Email or password is incorrect.");

  redirect("/projects");
}

export async function registerAction(): Promise<never> {
  authRedirect(
    "/login",
    "error",
    "Public registration is disabled. Accounts are provisioned by project owners and admins.",
  );
}

export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
