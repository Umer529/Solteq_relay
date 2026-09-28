"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckCircle2, GripVertical } from "lucide-react";
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
        <div className="task-card-main">
          <strong className="task-card-title">{task.title}</strong>
          {task.description && (
            <p className="task-description-preview">{task.description}</p>
          )}
        </div>
        <div className="task-card-footer">
          <div className="task-tags">
            <span className={`priority-label priority-${task.priority}`}>
              <span className={`priority-indicator priority-${task.priority}`} />
              {task.priority}
            </span>
            {task.dueDate && task.status !== "done" && (
              <span className={`task-due${overdue ? " overdue" : ""}`} title={overdue ? "Overdue" : "Due date"}>
                <Calendar size={11} strokeWidth={2} />
                {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <div className="task-assignee-wrap">
            {assignee ? (
              <span
                className="task-assignee"
                style={{ backgroundColor: assignee.profile.avatarColor }}
                title={`Assigned to ${assignee.profile.displayName}`}
              >
                {assignee.profile.displayName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="unassigned" title="Unassigned">Unassigned</span>
            )}
          </div>
        </div>
        {task.status === "done" && completer && completedAgo && (
          <div className="completion-credit">
            <CheckCircle2 size={11} strokeWidth={2} />
            <span>Done by {completer.profile.displayName} · {completedAgo}</span>
          </div>
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
        <GripVertical size={14} strokeWidth={1.7} />
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
