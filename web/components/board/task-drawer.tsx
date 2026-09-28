"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Membership, Task, TaskPriority } from "@relay/shared";
import { SubmitButton } from "@/components/ui/submit-button";

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

export interface TaskDraft {
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
}

export function TaskDrawer({
  task,
  members,
  canEdit,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  members: Membership[];
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (draft: TaskDraft) => Promise<void>;
  onDelete: (() => Promise<void>) | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) {
      try {
        element.showModal();
      } catch {
        // Ignore if already open
      }
    }
    return () => {
      if (element?.open) {
        element.close();
      }
    };
  }, []);

  async function submit(formData: FormData) {
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = String(formData.get("dueDate") ?? "") || null;
    if (dueDate && dueDate < today && (!task || task.dueDate !== dueDate)) {
      toast.error("Due date cannot be in the past. Please select today or a future date.");
      return;
    }

    await onSave({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "").trim() || null,
      priority: String(formData.get("priority") ?? "medium") as TaskPriority,
      assigneeId: String(formData.get("assigneeId") ?? "") || null,
      dueDate,
    });
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialog.current) {
      onClose();
    }
  }

  return (
    <dialog
      aria-labelledby="task-drawer-title"
      className="task-drawer"
      ref={dialog}
      onCancel={onClose}
      onClick={handleBackdropClick}
    >
      <div className="drawer-header">
        <div>
          <span>{task ? "Requirement details" : "New requirement"}</span>
          <h2 id="task-drawer-title">{task ? task.title : "Add to the board"}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close drawer">
          <X size={17} strokeWidth={1.7} />
        </button>
      </div>
      <form className="drawer-form" action={submit}>
        <fieldset disabled={!canEdit} title={!canEdit ? "You can only edit requirements assigned to you or created by you" : undefined}>
          <div className="field">
            <label htmlFor="task-title">Title</label>
            <input id="task-title" name="title" defaultValue={task?.title ?? ""} maxLength={200} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="task-description">Description</label>
            <textarea id="task-description" name="description" defaultValue={task?.description ?? ""} maxLength={4000} rows={7} />
          </div>
          <div className="drawer-grid">
            <div className="field">
              <label htmlFor="task-priority">Priority</label>
              <select id="task-priority" name="priority" defaultValue={task?.priority ?? "medium"}>
                {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="task-assignee">Assignee</label>
              <select id="task-assignee" name="assigneeId" defaultValue={task?.assigneeId ?? ""}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>{member.profile.displayName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="task-due-date">Due date</label>
            <input
              id="task-due-date"
              name="dueDate"
              type="date"
              defaultValue={task?.dueDate ?? ""}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </fieldset>
        <div className="drawer-actions">
          {task && (
            <button
              className="delete-button"
              type="button"
              disabled={!canDelete}
              title={!canDelete ? "Only admins or the creator can delete this requirement" : undefined}
              onClick={() => void onDelete?.()}
            >
              Delete
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <SubmitButton
            className="primary-button compact"
            disabled={!canEdit}
            pendingLabel={task ? "Saving…" : "Creating…"}
          >
            {task ? "Save changes" : "Create requirement"}
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}
