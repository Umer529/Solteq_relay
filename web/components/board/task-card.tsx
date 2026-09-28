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
        <span className={`priority-mark priority-${task.priority}`} aria-label={`${task.priority} priority`} />
        <strong>{task.title}</strong>
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
