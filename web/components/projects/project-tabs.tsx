"use client";

import { LayoutGrid, MessageSquare, Activity, Users } from "lucide-react";
import { useProjectContext, type ProjectTabId } from "./project-provider";

const tabItems: Array<{
  id: ProjectTabId;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "members", label: "Members", icon: Users },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const { activeTab, setActiveTab } = useProjectContext();

  return (
    <nav className="project-tabs" aria-label="Project sections">
      {tabItems.map(({ id, label, icon: Icon }) => {
        const href = `/projects/${projectId}/${id}`;
        const isActive = activeTab === id;
        return (
          <a
            aria-current={isActive ? "page" : undefined}
            className={`project-tab-link${isActive ? " active" : ""}`}
            href={href}
            key={id}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                e.preventDefault();
                setActiveTab(id);
              }
            }}
          >
            <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
