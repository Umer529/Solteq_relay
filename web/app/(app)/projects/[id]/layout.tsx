import { redirect } from "next/navigation";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { getMyProjects } from "@/lib/data/projects";
import { createClient } from "@/lib/supabase/server";
import { apiRequest } from "@/lib/api";
import type { ProjectSnapshot } from "@relay/shared";
import { ProjectHeaderBar } from "@/components/projects/project-header-bar";
import { ProjectProvider } from "@/components/projects/project-provider";

export default async function ProjectLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, projects] = await Promise.all([
    supabase.auth.getUser(),
    getMyProjects(),
  ]);
  if (!user) redirect("/login");
  const project = projects.find((item) => item.id === id);
  if (!project) redirect("/projects");

  const snapshot = await apiRequest<ProjectSnapshot>(`/projects/${id}/snapshot`, { method: "GET" });

  return (
    <main className="workspace-shell">
      <ProjectSidebar projects={projects} activeProjectId={id} />
      <section className="project-workspace" id="main-content">
        <ProjectHeaderBar
          projectName={project.name}
          projectDescription={project.description || "No project description"}
          projectRole={project.role}
        />
        <ProjectProvider currentUserId={user.id} initialSnapshot={snapshot}>
          {children}
        </ProjectProvider>
      </section>
    </main>
  );
}
