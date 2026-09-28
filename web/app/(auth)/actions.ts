"use server";

import { loginSchema, registerSchema } from "@relay/shared";
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

export async function registerAction(formData: FormData): Promise<never> {
  const result = registerSchema.safeParse({
    displayName: field(formData, "displayName"),
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!result.success) {
    authRedirect("/register", "error", "Check your name, email, and password.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: { data: { display_name: result.data.displayName } },
  });
  if (error) authRedirect("/register", "error", error.message);
  if (data.session) redirect("/projects");

  authRedirect("/login", "message", "Check your email to confirm your account, then sign in.");
}

export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
