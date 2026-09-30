"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Edit3,
  MessageSquare,
  Shield,
  UserCheck,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useProjectStore } from "@/store/project-store";
import { useProjectContext } from "@/components/projects/project-provider";

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  actorName: string;
  createdAt: string;
  isForYou: boolean;
  isRead: boolean;
  taskId?: string;
  destinationTab: "board" | "chat" | "members" | "activity";
  iconType: "assign" | "complete" | "status" | "edit" | "role" | "member" | "message" | "info";
}

export function NotificationCenter() {
  const { projectId, currentUserId } = useProjectContext();
  const activity = useProjectStore((state) => state.activity);
  const tasks = useProjectStore((state) => state.tasks);
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSeenActivityId = useRef<string | null>(null);

  // Load read notifications from localStorage
  useEffect(() => {
    if (!projectId || !currentUserId) return;
    try {
      const stored = localStorage.getItem(`relay_read_notes_${projectId}_${currentUserId}`);
      if (stored) {
        setReadIds(JSON.parse(stored) as string[]);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [currentUserId, projectId]);

  // Save read notifications to localStorage
  function markAsRead(idsToMark: string[]) {
    setReadIds((prev) => {
      const updated = Array.from(new Set([...prev, ...idsToMark]));
      try {
        localStorage.setItem(`relay_read_notes_${projectId}_${currentUserId}`, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }

  // Parse and prioritize notifications
  const notifications = useMemo<NotificationItem[]>(() => {
    return activity.map((entry) => {
      const payload = (entry.payload ?? {}) as Record<string, unknown>;
      const actorName = String(payload.actorName ?? "Someone");
      const isActor = entry.actorId === currentUserId;
      const targetUserId = String(payload.userId ?? payload.assigneeId ?? "");
      const isTargetUser = targetUserId === currentUserId;
      const taskId = payload.taskId ? String(payload.taskId) : undefined;
      const relatedTask = taskId ? tasks.find((t) => t.id === taskId) : undefined;
      const isTaskOwnerOrAssignee =
        relatedTask?.createdBy === currentUserId || relatedTask?.assigneeId === currentUserId;

      let isForYou = false;
      let title = "Project Update";
      let description = "";
      let destinationTab: "board" | "chat" | "members" | "activity" = "activity";
      let iconType: NotificationItem["iconType"] = "info";

      switch (entry.type) {
        case "task.created":
          if (payload.assigneeId === currentUserId) {
            isForYou = !isActor;
            title = "Requirement assigned to you";
            description = `${actorName} added "${payload.title}" and assigned it to you.`;
            iconType = "assign";
          } else {
            title = "New requirement created";
            description = `${actorName} created "${payload.title}".`;
            iconType = "edit";
          }
          destinationTab = "board";
          break;

        case "task.assigned":
          if (payload.assigneeId === currentUserId) {
            isForYou = !isActor;
            title = "You were assigned a requirement";
            description = `${actorName} assigned "${payload.title}" to you.`;
            iconType = "assign";
          } else if (isTaskOwnerOrAssignee && !isActor) {
            isForYou = true;
            title = "Requirement assignment changed";
            description = `${actorName} reassigned "${payload.title}" to ${payload.assigneeName ?? "team member"}.`;
            iconType = "status";
          } else {
            title = "Requirement reassigned";
            description = `${actorName} assigned "${payload.title}" to ${payload.assigneeName ?? "unassigned"}.`;
            iconType = "status";
          }
          destinationTab = "board";
          break;

        case "task.updated":
          if (isTaskOwnerOrAssignee && !isActor) {
            isForYou = true;
            title = "Your requirement was updated";
            description = `${actorName} updated details for "${payload.title}".`;
            iconType = "edit";
          } else {
            title = "Requirement updated";
            description = `${actorName} modified "${payload.title}".`;
            iconType = "edit";
          }
          destinationTab = "board";
          break;

        case "task.status_changed":
          const status = String(payload.status ?? "in_progress");
          if (isTaskOwnerOrAssignee && !isActor) {
            isForYou = true;
            title = status === "done" ? "Requirement completed!" : "Status moved";
            description = `${actorName} marked "${payload.title}" as ${status.replace("_", " ")}.`;
            iconType = status === "done" ? "complete" : "status";
          } else {
            title = "Requirement progress update";
            description = `${actorName} moved "${payload.title}" to ${status.replace("_", " ")}.`;
            iconType = status === "done" ? "complete" : "status";
          }
          destinationTab = "board";
          break;

        case "member.joined":
          if (isTargetUser && !isActor) {
            isForYou = true;
            title = "Welcome to the project!";
            description = `${actorName} added you to this project as a ${payload.role}.`;
            iconType = "role";
          } else {
            title = "New member joined";
            description = `${payload.targetName ?? "A new member"} joined as ${payload.role}.`;
            iconType = "member";
          }
          destinationTab = "members";
          break;

        case "member.role_changed":
          if (isTargetUser && !isActor) {
            isForYou = true;
            title = "Your project role was updated";
            description = `${actorName} changed your role to ${payload.role}.`;
            iconType = "role";
          } else {
            title = "Member role changed";
            description = `${payload.targetName ?? "Member"}'s role was updated to ${payload.role}.`;
            iconType = "role";
          }
          destinationTab = "members";
          break;

        case "message.created":
          if (!isActor) {
            title = "New team message";
            description = `${actorName}: ${String(payload.body ?? "").slice(0, 70)}...`;
            iconType = "message";
          } else {
            title = "Message sent";
            description = "You posted in project chat.";
            iconType = "message";
          }
          destinationTab = "chat";
          break;

        default:
          title = "Project activity";
          description = `${actorName} made updates in the project.`;
          iconType = "info";
          destinationTab = "activity";
      }

      return {
        id: entry.id,
        type: entry.type,
        title,
        description,
        actorName,
        createdAt: entry.createdAt,
        isForYou,
        isRead: readIds.includes(entry.id),
        taskId,
        destinationTab,
        iconType,
      };
    });
  }, [activity, currentUserId, readIds, tasks]);

  // Real-time toast for user-targeted events
  useEffect(() => {
    if (activity.length === 0) return;
    const latest = activity[0];
    if (!latest) return;
    if (lastSeenActivityId.current === null) {
      lastSeenActivityId.current = latest.id;
      return;
    }
    if (latest.id !== lastSeenActivityId.current) {
      lastSeenActivityId.current = latest.id;
      const latestNote = notifications.find((n) => n.id === latest.id);
      if (latestNote && latestNote.isForYou) {
        toast.info(latestNote.title, {
          description: latestNote.description,
        });
      }
    }
  }, [activity, notifications]);

  // Filter list exclusively for the user
  const forYouList = useMemo(() => notifications.filter((n) => n.isForYou), [notifications]);

  const unreadForYouCount = useMemo(
    () => forYouList.filter((n) => !n.isRead).length,
    [forYouList],
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Marks notification as read without redirecting or navigating to any page
  function handleNotificationClick(item: NotificationItem) {
    markAsRead([item.id]);
  }

  function handleMarkAllAsRead() {
    const unreadIds = forYouList.map((n) => n.id);
    markAsRead(unreadIds);
    toast.success("All caught up! Notifications marked as read.");
  }

  function renderIcon(iconType: NotificationItem["iconType"]) {
    switch (iconType) {
      case "assign":
        return <UserCheck size={16} className="note-icon icon-assign" />;
      case "complete":
        return <CheckCircle2 size={16} className="note-icon icon-complete" />;
      case "status":
        return <Clock size={16} className="note-icon icon-status" />;
      case "edit":
        return <Edit3 size={16} className="note-icon icon-edit" />;
      case "role":
        return <Shield size={16} className="note-icon icon-role" />;
      case "member":
        return <Users size={16} className="note-icon icon-member" />;
      case "message":
        return <MessageSquare size={16} className="note-icon icon-message" />;
      default:
        return <AlertCircle size={16} className="note-icon icon-info" />;
    }
  }

  return (
    <div className="notification-center-wrap" ref={containerRef}>
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadForYouCount} unread for you)`}
        title="View changes & notifications"
      >
        <Bell size={17} strokeWidth={1.8} />
        {unreadForYouCount > 0 && (
          <span className="notification-badge pulse">{unreadForYouCount > 9 ? "9+" : unreadForYouCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-popover" role="dialog" aria-label="Notifications panel">
          <div className="popover-header">
            <div className="popover-title-row">
              <div className="title-with-count">
                <strong>Notifications</strong>
                {unreadForYouCount > 0 && (
                  <span className="unread-pill">{unreadForYouCount} new</span>
                )}
              </div>
              <div className="header-actions">
                {unreadForYouCount > 0 && (
                  <button
                    type="button"
                    className="mark-all-read-btn"
                    onClick={handleMarkAllAsRead}
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  type="button"
                  className="close-popover-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="popover-body">
            {forYouList.length === 0 ? (
              <div className="empty-notifications">
                <div className="empty-icon-circle">
                  <CheckCircle2 size={24} className="text-emerald" />
                </div>
                <strong>All caught up!</strong>
                <p>No new notifications or tasks for you.</p>
              </div>
            ) : (
              <div className="notification-list">
                {forYouList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`notification-item ${!item.isRead ? "unread" : "read"} highlight-for-you`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <div className="item-icon-col">{renderIcon(item.iconType)}</div>
                    <div className="item-content-col">
                      <div className="item-top-row">
                        <strong className="item-title">{item.title}</strong>
                        <span className="item-time">{relativeTime(item.createdAt)}</span>
                      </div>
                      <p className="item-desc">{item.description}</p>
                    </div>
                    {!item.isRead && <span className="unread-dot" aria-label="Unread" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
