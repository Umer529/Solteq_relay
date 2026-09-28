"use client";

import { useProjectContext } from "@/components/projects/project-provider";
import { ChatClient } from "./chat-client";

export function ChatTab() {
  const { currentUserId, initialSnapshot } = useProjectContext();
  return <ChatClient currentUserId={currentUserId} initialSnapshot={initialSnapshot} />;
}
