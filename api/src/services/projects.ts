import {
  DEFAULT_PAGE_SIZE,
  MAX_ACTIVITY_ENTRIES,
  type ActivityEntry,
  type Message,
  type Project,
  type ProjectRole,
  type ProjectSnapshot,
} from "@relay/shared";
import { AppError } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";
import { throwDatabaseError } from "../lib/database-error.js";
import type {
  ActivityDbRow,
  ContributionDbRow,
  MemberDbRow,
  MessageDbRow,
  ProgressDbRow,
  ProjectDbRow,
  TaskDbRow,
} from "../types/database.js";
import { mapTask } from "./tasks.js";

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
      "This user does not exist. No Relay account was found for this email.",
    );
  }
  return data;
}

export async function createUserAndProfile(
  email: string,
  password: string,
  displayName?: string,
) {
  const admin = getSupabaseAdmin();
  const name = displayName?.trim() || email.split("@")[0];
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: name,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered") || error.status === 422) {
      return findProfileByEmail(email);
    }
    throw new AppError(400, "BAD_REQUEST", error.message);
  }

  if (!data.user) {
    throw new AppError(500, "INTERNAL_ERROR", "Failed to create user account.");
  }

  // Check if profile was created by the database trigger
  const profile = await admin
    .from("profiles")
    .select("id,email,display_name,avatar_color")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile.data) {
    const palette = ["#54705f", "#6b6859", "#596b78", "#765f58", "#5f6578", "#657052"];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const { data: inserted, error: insertError } = await admin
      .from("profiles")
      .insert({
        id: data.user.id,
        email: data.user.email ?? email,
        display_name: name,
        avatar_color: color,
      })
      .select("id,email,display_name,avatar_color")
      .single();
    if (insertError) throwDatabaseError(insertError);
    return inserted;
  }

  return profile.data;
}

export async function addMember(projectId: string, userId: string, role: ProjectRole, actorId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("add_project_member", {
    p_project_id: projectId,
    p_user_id: userId,
    p_role: role,
    p_actor_id: actorId,
  });
  if (error) {
    if (error.code === "23505") {
      throw new AppError(409, "CONFLICT", "This user is already a member of this project.");
    }
    throwDatabaseError(error);
  }
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

export async function getProjectSnapshot(projectId: string): Promise<ProjectSnapshot> {
  const admin = getSupabaseAdmin();
  const [projectResult, membersResult, tasksResult, progressResult, contributionResult, activityResult, messagesResult] =
    await Promise.all([
      admin.from("projects").select<string, ProjectDbRow>("*").eq("id", projectId).maybeSingle(),
      admin
        .from("memberships")
        .select<string, MemberDbRow>("project_id,user_id,role,created_at,profiles(id,email,display_name,avatar_color)")
        .eq("project_id", projectId)
        .order("created_at"),
      admin.from("tasks").select<string, TaskDbRow>("*").eq("project_id", projectId).order("position"),
      admin.from("project_progress").select<string, ProgressDbRow>("total,done").eq("project_id", projectId).maybeSingle(),
      admin.from("member_contributions").select<string, ContributionDbRow>("project_id,user_id,completed").eq("project_id", projectId),
      admin
        .from("activity_log")
        .select<string, ActivityDbRow>("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(MAX_ACTIVITY_ENTRIES),
      admin
        .from("messages")
        .select<string, MessageDbRow>("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(DEFAULT_PAGE_SIZE),
    ]);

  const error = [projectResult, membersResult, tasksResult, progressResult, contributionResult, activityResult, messagesResult]
    .map((result) => result.error)
    .find(Boolean);
  if (error) throwDatabaseError(error);
  if (!projectResult.data) throw new AppError(404, "NOT_FOUND", "Project not found.");

  const projectRow = projectResult.data;
  const project: Project = {
    id: projectRow.id,
    name: projectRow.name,
    description: projectRow.description,
    createdBy: projectRow.created_by,
    createdAt: projectRow.created_at,
  };
  const members = (membersResult.data ?? []).flatMap((row) =>
    row.profiles
      ? [
          {
            projectId: row.project_id,
            userId: row.user_id,
            role: row.role,
            createdAt: row.created_at,
            profile: {
              id: row.profiles.id,
              email: row.profiles.email,
              displayName: row.profiles.display_name,
              avatarColor: row.profiles.avatar_color,
            },
          },
        ]
      : [],
  );

  return {
    project,
    members,
    tasks: (tasksResult.data ?? []).map(mapTask),
    progress: {
      total: Number(progressResult.data?.total ?? 0),
      done: Number(progressResult.data?.done ?? 0),
    },
    contributions: (contributionResult.data ?? []).map((row) => ({
      projectId: row.project_id,
      userId: row.user_id,
      completed: Number(row.completed),
    })),
    activity: (activityResult.data ?? []).map((row): ActivityEntry => ({
      id: row.id,
      projectId: row.project_id,
      actorId: row.actor_id,
      type: row.type,
      payload: row.payload,
      createdAt: row.created_at,
    })),
    messages: (messagesResult.data ?? []).slice().reverse().map((row): Message => ({
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      body: row.body,
      editedAt: row.edited_at,
      createdAt: row.created_at,
    })),
  };
}
