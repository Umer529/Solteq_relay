import type { ProjectRole } from "@relay/shared";
import { createClient } from "@/lib/supabase/server";

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  role: ProjectRole;
}

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  createdAt: string;
  profile: {
    id: string;
    email: string;
    displayName: string;
    avatarColor: string;
  };
}

interface ProjectRow {
  project_id: string;
  role: ProjectRole;
  projects: { id: string; name: string; description: string | null } | null;
}

interface MemberRow {
  user_id: string;
  role: ProjectRole;
  created_at: string;
  profiles: { id: string; email: string; display_name: string; avatar_color: string } | null;
}

export async function getMyProjects(): Promise<ProjectSummary[]> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return [];

  const { data, error } = await supabase
    .from("memberships")
    .select("project_id,role,projects(id,name,description)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;

  const projects = new Map<string, ProjectSummary>();
  for (const row of (data ?? []) as unknown as ProjectRow[]) {
    if (!row.projects) continue;
    projects.set(row.projects.id, {
      id: row.projects.id,
      name: row.projects.name,
      description: row.projects.description,
      role: row.role,
    });
  }
  return [...projects.values()];
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id,role,created_at,profiles(id,email,display_name,avatar_color)")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw error;

  return ((data ?? []) as unknown as MemberRow[]).flatMap((row) =>
    row.profiles
      ? [
          {
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
}
