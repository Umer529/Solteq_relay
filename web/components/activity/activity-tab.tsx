"use client";

import { useProjectContext } from "@/components/projects/project-provider";
import { ActivityClient } from "./activity-client";

export function ActivityTab() {
  const { initialSnapshot, currentUserId } = useProjectContext();
  return <ActivityClient currentUserId={currentUserId} initialSnapshot={initialSnapshot} />;
}
