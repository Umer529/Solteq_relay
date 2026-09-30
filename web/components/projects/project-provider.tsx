"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ProjectSnapshot } from "@relay/shared";
import { useProjectStore } from "@/store/project-store";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import { BoardTab } from "@/components/board/board-tab";
import { ChatTab } from "@/components/chat/chat-tab";
import { ActivityTab } from "@/components/activity/activity-tab";
import { MembersTab } from "@/components/members/members-tab";
import { ProjectTabs } from "./project-tabs";

import { fetchProjectSnapshot } from "@/lib/browser-api";

export type ProjectTabId = "board" | "chat" | "activity" | "members";

interface ProjectContextValue {
  projectId: string;
  currentUserId: string;
  initialSnapshot: ProjectSnapshot;
  sendTyping: (name: string) => void;
  activeTab: ProjectTabId;
  setActiveTab: (tab: ProjectTabId) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}

function resolveTabFromPath(path: string): ProjectTabId {
  if (path.endsWith("/chat")) return "chat";
  if (path.endsWith("/activity")) return "activity";
  if (path.endsWith("/members")) return "members";
  return "board";
}

export function ProjectProvider({
  children,
  currentUserId,
  initialSnapshot,
  header,
}: {
  children?: React.ReactNode;
  currentUserId: string;
  initialSnapshot: ProjectSnapshot;
  header?: React.ReactNode;
}) {
  const projectId = initialSnapshot.project.id;
  const replaceSnapshot = useProjectStore((state) => state.replaceSnapshot);
  const storeProjectId = useProjectStore((state) => state.projectId);
  const pathname = usePathname();

  const [activeTab, setActiveTabState] = useState<ProjectTabId>(() => resolveTabFromPath(pathname));

  const { sendTyping } = useProjectRealtime(projectId, currentUserId);

  useEffect(() => {
    if (storeProjectId !== projectId) {
      replaceSnapshot(initialSnapshot);
    }
  }, [initialSnapshot, projectId, replaceSnapshot, storeProjectId]);

  useEffect(() => {
    if (activeTab === "board") {
      fetchProjectSnapshot(projectId)
        .then((snapshot) => {
          if (snapshot?.members) {
            snapshot.members.forEach((m) => useProjectStore.getState().upsertMember(m));
          }
          if (snapshot?.tasks) {
            snapshot.tasks.forEach((t) => useProjectStore.getState().upsertTask(t));
          }
        })
        .catch(() => {});
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    function onPopState() {
      const detected = resolveTabFromPath(window.location.pathname);
      setActiveTabState(detected);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function setActiveTab(tab: ProjectTabId) {
    setActiveTabState(tab);
    const targetUrl = `/projects/${projectId}/${tab}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, "", targetUrl);
    }
  }

  return (
    <ProjectContext.Provider
      value={{
        projectId,
        currentUserId,
        initialSnapshot,
        sendTyping,
        activeTab,
        setActiveTab,
      }}
    >
      {header}
      <ProjectTabs projectId={projectId} />
      <div className="project-content">
        <div style={{ display: activeTab === "board" ? "contents" : "none" }}>
          <BoardTab />
        </div>
        <div style={{ display: activeTab === "chat" ? "contents" : "none" }}>
          <ChatTab />
        </div>
        <div style={{ display: activeTab === "activity" ? "contents" : "none" }}>
          <ActivityTab />
        </div>
        <div style={{ display: activeTab === "members" ? "contents" : "none" }}>
          <MembersTab />
        </div>
      </div>
      {children && <div style={{ display: "none" }}>{children}</div>}
    </ProjectContext.Provider>
  );
}
