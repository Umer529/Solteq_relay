import { redirect } from "next/navigation";
import { getMyProjects } from "@/lib/data/projects";
import { apiRequest } from "@/lib/api";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { UserDirectoryClient, type UserDirectoryItem } from "./user-directory-client";

interface UsersPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const notice = await searchParams;
  const projects = await getMyProjects();

  const isOwnerOrAdmin = projects.some((p) => p.role === "owner" || p.role === "admin");
  if (!isOwnerOrAdmin) {
    redirect(
      "/projects?error=Only%20project%20owners%20and%20admins%20can%20access%20user%20management.",
    );
  }

  let users: UserDirectoryItem[] = [];
  try {
    users = await apiRequest<UserDirectoryItem[]>("/users", { method: "GET" });
  } catch (err) {
    console.error("Failed to load user directory:", err);
  }

  return (
    <main className="workspace-shell">
      <ProjectSidebar projects={projects} activePage="users" />
      <section className="workspace-content-pane" id="main-content" style={{ overflowY: "auto" }}>
        <UserDirectoryClient notice={notice} projects={projects} users={users} />
      </section>
    </main>
  );
}
