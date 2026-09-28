"use client";

import type { ProjectSnapshot } from "@relay/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import { useProjectStore } from "@/store/project-store";

function fingerprint(snapshot: ProjectSnapshot): string {
  return snapshot.members.map((member) => `${member.userId}:${member.role}`).sort().join("|");
}

export function ProjectRealtimeBridge({
  snapshot,
  currentUserId,
}: {
  snapshot: ProjectSnapshot;
  currentUserId: string;
}) {
  const router = useRouter();
  const members = useProjectStore((state) => state.members);
  const projectId = useProjectStore((state) => state.projectId);
  const replaceSnapshot = useProjectStore((state) => state.replaceSnapshot);
  const lastFingerprint = useRef(fingerprint(snapshot));

  useEffect(() => replaceSnapshot(snapshot), [replaceSnapshot, snapshot]);
  useProjectRealtime(snapshot.project.id, currentUserId);
  useEffect(() => {
    if (projectId !== snapshot.project.id) return;
    const nextFingerprint = members.map((member) => `${member.userId}:${member.role}`).sort().join("|");
    if (nextFingerprint !== lastFingerprint.current) {
      lastFingerprint.current = nextFingerprint;
      router.refresh();
    }
  }, [members, projectId, router, snapshot.project.id]);

  return null;
}
