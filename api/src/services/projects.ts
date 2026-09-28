import type { ProjectRole } from "@relay/shared";
import { AppError } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";
import { throwDatabaseError } from "../lib/database-error.js";

interface ProjectInput {
  name: string;
  description?: string | null;
}

export async function createProject(input: ProjectInput, actorId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("create_project", {
    p_name: input.name,
    p_description: input.description ?? null,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  return data;
}

export async function updateProject(projectId: string, input: Partial<ProjectInput>, actorId: string) {
  const admin = getSupabaseAdmin();
  const { data: current, error: readError } = await admin
    .from("projects")
    .select("name,description")
    .eq("id", projectId)
    .maybeSingle();
  if (readError) throwDatabaseError(readError);
  if (!current) throw new AppError(404, "NOT_FOUND", "Project not found.");

  const { data, error } = await admin.rpc("update_project", {
    p_project_id: projectId,
    p_name: input.name ?? current.name,
    p_description: input.description === undefined ? current.description : input.description,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  return data;
}

export async function deleteProject(projectId: string, actorId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("delete_project", {
    p_project_id: projectId,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
}

export async function findProfileByEmail(email: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id,email,display_name,avatar_color")
    .ilike("email", email)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  if (!data) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "No Relay account was found for this email. Ask them to register at /register, then add them again.",
    );
  }
  return data;
}

export async function addMember(projectId: string, userId: string, role: ProjectRole, actorId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("add_project_member", {
    p_project_id: projectId,
    p_user_id: userId,
    p_role: role,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  return data;
}

export async function getMembership(projectId: string, userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("memberships")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  if (!data) throw new AppError(404, "NOT_FOUND", "Membership not found.");
  return { role: data.role as ProjectRole };
}

export async function getOwnerCount(projectId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("role", "owner");
  if (error) throwDatabaseError(error);
  return count ?? 0;
}

export async function changeMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
  actorId: string,
) {
  const { data, error } = await getSupabaseAdmin().rpc("change_member_role", {
    p_project_id: projectId,
    p_user_id: userId,
    p_role: role,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
  return data;
}

export async function removeMember(projectId: string, userId: string, actorId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("remove_project_member", {
    p_project_id: projectId,
    p_user_id: userId,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(error);
}
