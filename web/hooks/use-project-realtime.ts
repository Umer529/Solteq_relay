"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActivityEntry, Membership, Message, Task } from "@relay/shared";
import { fetchProjectSnapshot } from "@/lib/browser-api";
import { createClient } from "@/lib/supabase/browser";
import { useProjectStore } from "@/store/project-store";

type Row = Record<string, unknown>;

function text(row: Row, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function nullableText(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function taskFromRow(row: Row): Task {
  return {
    id: text(row, "id"),
    projectId: text(row, "project_id"),
    title: text(row, "title"),
    description: nullableText(row, "description"),
    status: text(row, "status") as Task["status"],
    priority: text(row, "priority") as Task["priority"],
    assigneeId: nullableText(row, "assignee_id"),
    createdBy: text(row, "created_by"),
    completedBy: nullableText(row, "completed_by"),
    completedAt: nullableText(row, "completed_at"),
    position: Number(row.position ?? 0),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

function activityFromRow(row: Row): ActivityEntry {
  const payload = row.payload;
  return {
    id: text(row, "id"),
    projectId: text(row, "project_id"),
    actorId: nullableText(row, "actor_id"),
    type: text(row, "type"),
    payload: typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {},
    createdAt: text(row, "created_at"),
  };
}

function messageFromRow(row: Row): Message {
  return {
    id: text(row, "id"),
    projectId: text(row, "project_id"),
    userId: text(row, "user_id"),
    body: text(row, "body"),
    createdAt: text(row, "created_at"),
  };
}

export function useProjectRealtime(projectId: string, currentUserId: string): void {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const store = useProjectStore.getState();
    let cancelled = false;

    async function refetch() {
      try {
        const snapshot = await fetchProjectSnapshot(projectId);
        if (!cancelled) useProjectStore.getState().replaceSnapshot(snapshot);
      } catch {
        // A membership deletion can make the snapshot inaccessible before its event arrives.
      }
    }

    async function upsertMembership(row: Row) {
      const userId = text(row, "user_id");
      const { data } = await supabase
        .from("memberships")
        .select("project_id,user_id,role,created_at,profiles(id,email,display_name,avatar_color)")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!data || cancelled) return;
      const profile = data.profiles as unknown as {
        id: string; email: string; display_name: string; avatar_color: string;
      } | null;
      if (!profile) return;
      const member: Membership = {
        projectId: data.project_id,
        userId: data.user_id,
        role: data.role as Membership["role"],
        createdAt: data.created_at,
        profile: {
          id: profile.id,
          email: profile.email,
          displayName: profile.display_name,
          avatarColor: profile.avatar_color,
        },
      };
      useProjectStore.getState().upsertMember(member);
    }

    const channel = supabase
      .channel(`project:${projectId}:db`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            useProjectStore.getState().removeTask(text(payload.old as Row, "id"));
          } else {
            useProjectStore.getState().upsertTask(taskFromRow(payload.new as Row));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memberships", filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removedUserId = text(payload.old as Row, "user_id");
            useProjectStore.getState().removeMember(removedUserId);
            if (removedUserId === currentUserId) {
              useProjectStore.getState().setRemoved(true);
              router.replace("/projects?removed=1");
            }
          } else {
            void upsertMembership(payload.new as Row);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter: `project_id=eq.${projectId}` },
        (payload) => useProjectStore.getState().upsertActivity(activityFromRow(payload.new as Row)),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => useProjectStore.getState().upsertMessage(messageFromRow(payload.new as Row)),
      )
      .subscribe((status) => {
        const isConnected = status === "SUBSCRIBED";
        useProjectStore.getState().setConnected(isConnected);
        if (isConnected) void refetch();
      });

    store.setConnected(false);
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, projectId, router]);
}
