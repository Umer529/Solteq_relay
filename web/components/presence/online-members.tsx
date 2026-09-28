"use client";

import { useProjectStore } from "@/store/project-store";

export function OnlineMembers({ projectId }: { projectId: string }) {
  const activeProjectId = useProjectStore((state) => state.projectId);
  const members = useProjectStore((state) => state.members);
  const onlineUserIds = useProjectStore((state) => state.onlineUserIds);
  const online = activeProjectId === projectId
    ? members.filter((member) => onlineUserIds.includes(member.userId))
    : [];

  return (
    <section className="sidebar-online" aria-label="Online project members">
      <span>Online · {online.length}</span>
      <div>
        {online.slice(0, 6).map((member) => (
          <i
            key={member.userId}
            style={{ backgroundColor: member.profile.avatarColor }}
            title={`${member.profile.displayName} is online`}
          >
            {member.profile.displayName.charAt(0).toUpperCase()}
          </i>
        ))}
        {online.length === 0 && <small>No one online</small>}
      </div>
    </section>
  );
}
