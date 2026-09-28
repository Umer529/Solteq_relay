import { Plus, Radio } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import type { ProjectSummary } from "@/lib/data/projects";
import { ProjectSwitcher } from "./project-switcher";
import { OnlineMembers } from "@/components/presence/online-members";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProjectSidebar({
  projects,
  activeProjectId,
}: {
  projects: ProjectSummary[];
  activeProjectId?: string;
}) {
  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-brand">
        <span className="auth-brand-mark" aria-hidden="true">
          <Radio size={16} strokeWidth={1.8} />
        </span>
        <div>
          <strong>Relay</strong>
          <span>Project workspace</span>
        </div>
      </div>
      <ProjectSwitcher projects={projects} />
      <nav className="project-nav" aria-label="Projects">
        <div className="sidebar-section-label">
          <span>Projects</span>
          <Link href="/projects" aria-label="Create project" title="Create project">
            <Plus size={15} strokeWidth={1.7} />
          </Link>
        </div>
        {projects.map((project) => (
          <Link
            aria-current={project.id === activeProjectId ? "page" : undefined}
            className={project.id === activeProjectId ? "active" : undefined}
            href={`/projects/${project.id}/board`}
            key={project.id}
          >
            <span className="project-initial">{project.name.charAt(0).toUpperCase()}</span>
            <span className="project-link-copy">
              <strong>{project.name}</strong>
              <small>{project.role}</small>
            </span>
          </Link>
        ))}
      </nav>
      {activeProjectId && <OnlineMembers projectId={activeProjectId} />}
      <div className="sidebar-footer">
        <ThemeToggle />
        <form className="sidebar-logout" action={logoutAction}>
          <SubmitButton pendingLabel="Signing out…">Sign out</SubmitButton>
        </form>
      </div>
    </aside>
  );
}
