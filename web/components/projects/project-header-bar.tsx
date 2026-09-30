"use client";

import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { ProjectRole } from "@relay/shared";
import { NotificationCenter } from "@/components/notifications/notification-center";

export function ProjectHeaderBar({
  projectName,
  projectDescription,
  projectRole,
}: {
  projectName: string;
  projectDescription: string;
  projectRole: ProjectRole;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const sidebar = document.querySelector(".workspace-sidebar");
    if (!sidebar) return;
    if (mobileMenuOpen) {
      sidebar.classList.add("mobile-open");
      document.body.style.overflow = "hidden";
    } else {
      sidebar.classList.remove("mobile-open");
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 767) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <header className="project-header">
        <div className="project-header-left">
          <button
            className="mobile-sidebar-toggle"
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
          </button>
          <div className="project-header-info">
            <h1>{projectName}</h1>
            <p>{projectDescription || "No project description"}</p>
          </div>
        </div>
        <div className="project-header-right">
          <NotificationCenter />
          <span className={`role-badge role-${projectRole}`}>{projectRole}</span>
        </div>
      </header>
      {mobileMenuOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
