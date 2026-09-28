"use client";

import Link from "next/link";
import type { ActivityEntry, ProjectSnapshot } from "@relay/shared";
import { Activity, ListFilter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import { useProjectStore } from "@/store/project-store";

function payloadText(entry: ActivityEntry, key: string): string {
  const value = entry.payload[key];
  return typeof value === "string" ? value : "";
}

function statusName(value: string): string {
  return value === "in_progress" ? "In progress" : value.charAt(0).toUpperCase() + value.slice(1);
}

function sentence(entry: ActivityEntry): string {
  const actor = payloadText(entry, "actorName") || "A former member";
  const title = payloadText(entry, "title");
  const target = payloadText(entry, "targetName");
  switch (entry.type) {
    case "project.created": return `${actor} created the project`;
    case "project.updated": return `${actor} updated the project details`;
    case "task.created": return `${actor} created “${title}”`;
    case "task.updated": return `${actor} updated “${title}”`;
    case "task.assigned": return `${actor} assigned “${title}” to ${payloadText(entry, "assigneeName") || "nobody"}`;
    case "task.deleted": return `${actor} deleted “${title}”`;
    case "task.status_changed":
      return `${actor} moved “${title}” from ${statusName(payloadText(entry, "from"))} to ${statusName(payloadText(entry, "to"))}`;
    case "member.joined": return `${actor} added ${target || actor} to the project`;
    case "member.removed": return `${actor} removed ${target} from the project`;
    case "member.role_changed":
      return `${actor} changed ${target} from ${payloadText(entry, "from")} to ${payloadText(entry, "to")}`;
    case "message.posted": return `${actor} posted a message`;
    default: return `${actor} made a project update`;
  }
}

function relativeTime(value: string, now: number): string {
  const deltaSeconds = Math.round((new Date(value).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(deltaSeconds) < 60) return formatter.format(deltaSeconds, "second");
  const minutes = Math.round(deltaSeconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

export function ActivityClient({
  initialSnapshot,
  currentUserId,
}: {
  initialSnapshot: ProjectSnapshot;
  currentUserId: string;
}) {
  const projectId = initialSnapshot.project.id;
  const storeProjectId = useProjectStore((state) => state.projectId);
  const storedActivity = useProjectStore((state) => state.activity);
  const storedMembers = useProjectStore((state) => state.members);
  const storedTasks = useProjectStore((state) => state.tasks);
  const replaceSnapshot = useProjectStore((state) => state.replaceSnapshot);
  const activity = storeProjectId === projectId ? storedActivity : initialSnapshot.activity;
  const members = storeProjectId === projectId ? storedMembers : initialSnapshot.members;
  const tasks = storeProjectId === projectId ? storedTasks : initialSnapshot.tasks;
  const [userFilter, setUserFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => replaceSnapshot(initialSnapshot), [initialSnapshot, replaceSnapshot]);
  useProjectRealtime(projectId, currentUserId);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const eventTypes = useMemo(() => [...new Set(activity.map((entry) => entry.type))].sort(), [activity]);
  const filtered = activity.filter(
    (entry) =>
      (userFilter === "all" || entry.actorId === userFilter) &&
      (typeFilter === "all" || entry.type === typeFilter),
  );

  return (
    <div className="activity-view">
      <div className="content-heading activity-heading">
        <div><h2>Activity</h2><p>Decisions and project changes, updated live.</p></div>
        <div className="activity-filters">
          <ListFilter size={14} strokeWidth={1.7} />
          <select aria-label="Filter activity by member" value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
            <option value="all">Everyone</option>
            {members.map((member) => <option key={member.userId} value={member.userId}>{member.profile.displayName}</option>)}
          </select>
          <select aria-label="Filter activity by event type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All events</option>
            {eventTypes.map((type) => <option key={type} value={type}>{type.replaceAll(".", " · ")}</option>)}
          </select>
        </div>
      </div>
      <div className="activity-feed" aria-live="polite">
        {filtered.map((entry) => {
          const actor = members.find((member) => member.userId === entry.actorId);
          const taskId = payloadText(entry, "taskId");
          const taskExists = taskId && tasks.some((task) => task.id === taskId);
          return (
            <article className="activity-row" key={entry.id}>
              <span className="activity-avatar" style={{ backgroundColor: actor?.profile.avatarColor ?? "var(--muted)" }}>
                {(actor?.profile.displayName ?? (payloadText(entry, "actorName") || "?")).charAt(0).toUpperCase()}
              </span>
              <div>
                <p>{sentence(entry)}</p>
                <time dateTime={entry.createdAt} title={new Date(entry.createdAt).toLocaleString()}>
                  {relativeTime(entry.createdAt, now)}
                </time>
              </div>
              {taskExists && <Link href={`/projects/${projectId}/board?task=${taskId}`}>Open</Link>}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="feed-empty"><Activity size={18} strokeWidth={1.6} /><p>No activity matches these filters.</p></div>
        )}
      </div>
    </div>
  );
}
