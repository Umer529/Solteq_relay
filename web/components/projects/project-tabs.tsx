"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageSquare, Activity, Users } from "lucide-react";

const tabItems = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "members", label: "Members", icon: Users },
] as const;

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="project-tabs" aria-label="Project sections">
      {tabItems.map(({ id, label, icon: Icon }) => {
        const href = `/projects/${projectId}/${id}`;
        const isActive = pathname === href;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`project-tab-link${isActive ? " active" : ""}`}
            href={href}
            prefetch={true}
            key={id}
          >
            <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
