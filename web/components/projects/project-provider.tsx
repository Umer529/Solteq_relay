"use client";

import { createContext, useContext, useEffect } from "react";
import type { ProjectSnapshot } from "@relay/shared";
import { useProjectStore } from "@/store/project-store";

interface ProjectContextValue {
  projectId: string;
  currentUserId: string;
  initialSnapshot: ProjectSnapshot;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}

export function ProjectProvider({
  children,
  currentUserId,
  initialSnapshot,
}: {
  children: React.ReactNode;
  currentUserId: string;
  initialSnapshot: ProjectSnapshot;
}) {
  const projectId = initialSnapshot.project.id;
  const replaceSnapshot = useProjectStore((state) => state.replaceSnapshot);
  const storeProjectId = useProjectStore((state) => state.projectId);

  useEffect(() => {
    if (storeProjectId !== projectId) {
      replaceSnapshot(initialSnapshot);
    }
  }, [initialSnapshot, projectId, replaceSnapshot, storeProjectId]);

  return (
    <ProjectContext.Provider value={{ projectId, currentUserId, initialSnapshot }}>
      {children}
    </ProjectContext.Provider>
  );
}
