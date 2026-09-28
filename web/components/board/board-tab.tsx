"use client";

import { useProjectContext } from "@/components/projects/project-provider";
import { BoardClient } from "./board-client";

export function BoardTab() {
  const { currentUserId, initialSnapshot } = useProjectContext();
  return <BoardClient currentUserId={currentUserId} initialSnapshot={initialSnapshot} />;
}
