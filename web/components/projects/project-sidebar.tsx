import { Plus, Radio, Users } from "lucide-react";
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
  activePage,
}: {
  projects: ProjectSummary[];
  activeProjectId?: string;
  activePage?: string;
}) {
  const hasAdminPower = projects.some((p) => p.role === "owner" || p.role === "admin");

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
            aria-current={project.id === activeProjectId && !activePage ? "page" : undefined}
            className={project.id === activeProjectId && !activePage ? "active" : undefined}
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

      {hasAdminPower && (
        <div className="sidebar-admin-section">
          <div className="sidebar-section-label">
            <span>Administration</span>
          </div>
          <Link
            aria-current={activePage === "users" ? "page" : undefined}
            className={`sidebar-admin-link ${activePage === "users" ? "active" : ""}`}
            href="/users"
          >
            <span className="sidebar-admin-icon">
              <Users size={15} strokeWidth={1.8} />
            </span>
            <span className="project-link-copy">
              <strong>Manage Users</strong>
              <small>Provision & invite</small>
            </span>
          </Link>
        </div>
      )}

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
