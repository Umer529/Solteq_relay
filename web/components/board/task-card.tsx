"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Membership, Task } from "@relay/shared";

export function TaskCard({
  task,
  members,
  disabled,
  onOpen,
}: {
  task: Task;
  members: Membership[];
  disabled: boolean;
  onOpen: () => void;
}) {
  const sortable = useSortable({ id: task.id, data: { status: task.status }, disabled });
  const assignee = members.find((member) => member.userId === task.assigneeId);
  const completer = members.find((member) => member.userId === task.completedBy);
  const overdue = Boolean(task.dueDate && task.status !== "done" && task.dueDate < new Date().toISOString().slice(0, 10));
  const completedAgo = task.completedAt ? relativeTime(task.completedAt) : null;
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <article
      className={`task-card${sortable.isDragging ? " dragging" : ""}`}
      ref={sortable.setNodeRef}
      style={style}
    >
      <button className="task-card-body" type="button" onClick={onOpen}>
        <strong>{task.title}</strong>
        {task.description && <span className="task-description-preview">{task.description}</span>}
        <span className="task-card-meta">
          <span className={`priority-label priority-${task.priority}`}>{task.priority}</span>
          {assignee ? (
            <span
              className="task-assignee"
              style={{ backgroundColor: assignee.profile.avatarColor }}
              title={assignee.profile.displayName}
            >
              {assignee.profile.displayName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <span className="unassigned">Unassigned</span>
          )}
        </span>
        {task.status === "done" && completer && completedAgo && (
          <span className="completion-credit">Done by {completer.profile.displayName} · {completedAgo}</span>
        )}
        {task.dueDate && task.status !== "done" && (
          <span className={`task-due${overdue ? " overdue" : ""}`}>
            {overdue ? "Overdue" : "Due"} {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
        )}
      </button>
      <button
        className="drag-handle"
        type="button"
        aria-label={`Move ${task.title}`}
        title={disabled ? "Viewers cannot move requirements" : "Drag requirement"}
        disabled={disabled}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical size={15} strokeWidth={1.6} />
      </button>
    </article>
  );
}

function relativeTime(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(elapsed / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
