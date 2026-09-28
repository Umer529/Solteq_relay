import { FolderPlus } from "lucide-react";
import { createProjectAction } from "./actions";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { getMyProjects } from "@/lib/data/projects";

interface ProjectsPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const projects = await getMyProjects();
  const { error } = await searchParams;

  return (
    <main className="workspace-shell">
      <ProjectSidebar projects={projects} />
      <section className="workspace-empty">
        <div className="empty-icon" aria-hidden="true">
          <FolderPlus size={20} strokeWidth={1.6} />
        </div>
        <h1>{projects.length === 0 ? "Create your first project" : "Create another project"}</h1>
        <p>Give the work a short name. You will become its owner automatically.</p>
        {error && <div className="form-message" data-tone="error">{error}</div>}
        <form className="create-project-form" action={createProjectAction}>
          <div className="field">
            <label htmlFor="name">Project name</label>
            <input id="name" name="name" maxLength={80} required placeholder="Website redesign" />
          </div>
          <div className="field">
            <label htmlFor="description">Description <span>Optional</span></label>
            <input id="description" name="description" maxLength={2000} placeholder="What is this team delivering?" />
          </div>
          <button className="primary-button" type="submit">Create project</button>
        </form>
      </section>
    </main>
  );
}
