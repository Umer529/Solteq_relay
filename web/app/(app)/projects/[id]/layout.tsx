import { redirect } from "next/navigation";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { getMyProjects } from "@/lib/data/projects";

export default async function ProjectLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const projects = await getMyProjects();
  const project = projects.find((item) => item.id === id);
  if (!project) redirect("/projects");

  return (
    <main className="workspace-shell">
      <ProjectSidebar projects={projects} activeProjectId={id} />
      <section className="project-workspace">
        <header className="project-header">
          <div>
            <h1>{project.name}</h1>
            <p>{project.description || "No project description"}</p>
          </div>
          <span className={`role-badge role-${project.role}`}>{project.role}</span>
        </header>
        <ProjectTabs projectId={id} />
        <div className="project-content">{children}</div>
      </section>
    </main>
  );
}
