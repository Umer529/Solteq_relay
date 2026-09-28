"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = ["chat", "board", "activity", "members"] as const;

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="project-tabs" aria-label="Project sections">
      {tabs.map((tab) => {
        const href = `/projects/${projectId}/${tab}`;
        return (
          <Link
            aria-current={pathname === href ? "page" : undefined}
            className={pathname === href ? "active" : undefined}
            href={href}
            key={tab}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Link>
        );
      })}
    </nav>
  );
}
