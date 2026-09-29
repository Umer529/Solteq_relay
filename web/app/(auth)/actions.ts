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

export async function registerAction(formData: FormData): Promise<never> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password").trim();
  const displayName = field(formData, "displayName").trim() || email.split("@")[0];
  const role = field(formData, "role") || "member";

  if (!email || !password || password.length < 6) {
    authRedirect("/register", "error", "Please provide a valid email and a password of at least 6 characters.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        initial_role: role,
      },
    },
  });

  if (error) {
    authRedirect("/register", "error", error.message);
  }

  if (data?.session) {
    redirect("/projects");
  }

  authRedirect("/login", "message", "Account created successfully! Please sign in.");
}

export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
