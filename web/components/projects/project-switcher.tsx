"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectSummary } from "@/lib/data/projects";

export function ProjectSwitcher({ projects }: { projects: ProjectSummary[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => projects.filter((project) => project.name.toLowerCase().includes(query.toLowerCase())),
    [projects, query],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        dialog.current?.showModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function choose(projectId: string) {
    dialog.current?.close();
    setQuery("");
    router.push(`/projects/${projectId}/board`);
  }

  return (
    <>
      <button className="switcher-button" type="button" onClick={() => dialog.current?.showModal()}>
        <Search size={14} strokeWidth={1.7} />
        Switch project
        <kbd>⌘K</kbd>
      </button>
      <dialog aria-label="Switch project" className="switcher-dialog" ref={dialog} onClose={() => setQuery("")}>
        <div className="switcher-search">
          <Search size={16} strokeWidth={1.7} />
          <input
            aria-label="Find a project"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a project…"
          />
        </div>
        <div className="switcher-results">
          {filtered.map((project) => (
            <button key={project.id} type="button" onClick={() => choose(project.id)}>
              <span className="project-initial">{project.name.charAt(0).toUpperCase()}</span>
              <span>{project.name}</span>
              <small>{project.role}</small>
            </button>
          ))}
          {filtered.length === 0 && <p>No matching projects.</p>}
        </div>
      </dialog>
    </>
  );
}
