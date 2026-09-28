"use client";

import { useProjectStore } from "@/store/project-store";

export function PresenceDot({ userId }: { userId: string }) {
  const online = useProjectStore((state) => state.onlineUserIds.includes(userId));
  return (
    <span
      className={`presence-dot${online ? " online" : ""}`}
      title={online ? "Online" : "Offline"}
      aria-label={online ? "Online" : "Offline"}
    />
  );
}
