"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TASK_POSITION_GAP, can, type ProjectSnapshot, type Task, type TaskStatus } from "@relay/shared";
import { ListFilter, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createTask, deleteTask, moveTask, updateTask } from "@/lib/browser-api";
import { useProjectStore } from "@/store/project-store";
import { ProgressSummary } from "./progress-summary";
import { TaskColumn } from "./task-column";
import { TaskDrawer, type TaskDraft } from "./task-drawer";

const statuses: TaskStatus[] = ["todo", "in_progress", "done"];

export function BoardClient({
  initialSnapshot,
  currentUserId,
}: {
  initialSnapshot: ProjectSnapshot;
  currentUserId: string;
}) {
  const projectId = initialSnapshot.project.id;
  const searchParams = useSearchParams();
  const linkedTaskId = searchParams.get("task");
  const openedLinkedTask = useRef<string | null>(null);
  const storeProjectId = useProjectStore((state) => state.projectId);
  const storedTasks = useProjectStore((state) => state.tasks);
  const storedMembers = useProjectStore((state) => state.members);
  const connected = useProjectStore((state) => state.connected);
  const removed = useProjectStore((state) => state.removed);
  const upsertTask = useProjectStore((state) => state.upsertTask);
  const removeTask = useProjectStore((state) => state.removeTask);
  const tasks = storeProjectId === projectId ? storedTasks : initialSnapshot.tasks;
  const members = storeProjectId === projectId ? storedMembers : initialSnapshot.members;
  const actor = members.find((member) => member.userId === currentUserId);
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>();
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!linkedTaskId || openedLinkedTask.current === linkedTaskId) return;
    const linkedTask = tasks.find((task) => task.id === linkedTaskId);
    if (linkedTask) {
      openedLinkedTask.current = linkedTaskId;
      setSelectedTask(linkedTask);
    }
  }, [linkedTaskId, tasks]);

  const mayCreate = actor ? can(actor.role, "task.create", { actorId: currentUserId }) : false;
  const canMoveTask = useCallback(
    (task: Task) => {
      if (!actor) return false;
      return can(actor.role, "task.changeStatus", {
        actorId: currentUserId,
        task: { createdBy: task.createdBy, assigneeId: task.assigneeId },
      });
    },
    [actor, currentUserId],
  );
  const filteredTasks = useMemo(
    () => tasks.filter((task) =>
      (assigneeFilter === "all" || task.assigneeId === assigneeFilter) &&
      (!completionFilter || task.completedBy === completionFilter),
    ),
    [assigneeFilter, completionFilter, tasks],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable='true']");
      if (!isTyping && event.key.toLowerCase() === "n" && mayCreate) {
        event.preventDefault();
        setSelectedTask(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mayCreate]);

  async function saveTask(draft: TaskDraft) {
    if (!actor) return;
    if (selectedTask) {
      const previous = selectedTask;
      const optimistic: Task = { ...previous, ...draft, updatedAt: new Date().toISOString() };
      upsertTask(optimistic);
      setSelectedTask(undefined);
      try {
        upsertTask(await updateTask(projectId, previous.id, draft));
        toast.success("Requirement updated");
      } catch (error) {
        upsertTask(previous);
        toast.error(error instanceof Error ? error.message : "Could not update the requirement.");
      }
      return;
    }

    const now = new Date().toISOString();
    const position = Math.max(0, ...tasks.filter((task) => task.status === "todo").map((task) => task.position)) + TASK_POSITION_GAP;
    const temporary: Task = {
      id: crypto.randomUUID(),
      projectId,
      title: draft.title,
      description: draft.description,
      status: "todo",
      priority: draft.priority,
      assigneeId: draft.assigneeId,
      dueDate: draft.dueDate,
      createdBy: currentUserId,
      completedBy: null,
      completedAt: null,
      position,
      createdAt: now,
      updatedAt: now,
    };
    upsertTask(temporary);
    setSelectedTask(undefined);
    try {
      const created = await createTask(projectId, { ...draft, position });
      removeTask(temporary.id);
      upsertTask(created);
      toast.success("Requirement created");
    } catch (error) {
      removeTask(temporary.id);
      toast.error(error instanceof Error ? error.message : "Could not create the requirement.");
    }
  }

  async function removeSelectedTask() {
    if (!selectedTask) return;
    const previous = selectedTask;
    removeTask(previous.id);
    setSelectedTask(undefined);
    try {
      await deleteTask(projectId, previous.id);
      toast.success("Requirement deleted");
    } catch (error) {
      upsertTask(previous);
      toast.error(error instanceof Error ? error.message : "Could not delete the requirement.");
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const previous = tasks.find((task) => task.id === taskId);
    if (!previous || !event.over || !canMoveTask(previous)) return;
    const overId = String(event.over.id);
    if (overId === taskId) return;
    const overTask = tasks.find((task) => task.id === overId);
    const targetStatus = overId.startsWith("column:")
      ? overId.slice("column:".length) as TaskStatus
      : overTask?.status;
    if (!targetStatus || !statuses.includes(targetStatus)) return;

    const targetTasks = tasks
      .filter((task) => task.status === targetStatus && task.id !== taskId)
      .sort((left, right) => left.position - right.position);
    let position = (targetTasks.at(-1)?.position ?? 0) + TASK_POSITION_GAP;
    if (overTask && overTask.id !== taskId) {
      const targetIndex = targetTasks.findIndex((task) => task.id === overTask.id);
      const before = targetTasks[targetIndex - 1];
      position = before ? (before.position + overTask.position) / 2 : overTask.position - TASK_POSITION_GAP;
    }
    if (previous.status === targetStatus && previous.position === position) return;

    const now = new Date().toISOString();
    const optimistic: Task = {
      ...previous,
      status: targetStatus,
      position,
      completedBy: targetStatus === "done" ? currentUserId : null,
      completedAt: targetStatus === "done" ? now : null,
      updatedAt: now,
    };
    upsertTask(optimistic);
    try {
      upsertTask(await moveTask(projectId, taskId, { status: targetStatus, position }));
    } catch (error) {
      upsertTask(previous);
      toast.error(error instanceof Error ? error.message : "Could not move the requirement.");
    }
  }

  if (removed) {
    return <div className="removed-state"><h2>Project access removed</h2><p>You are no longer a member of this project.</p></div>;
  }

  const selectedCanEdit = selectedTask && actor
    ? can(actor.role, "task.edit", {
        actorId: currentUserId,
        task: { createdBy: selectedTask.createdBy, assigneeId: selectedTask.assigneeId },
      })
    : mayCreate;
  const selectedCanDelete = selectedTask && actor
    ? can(actor.role, "task.delete", {
        actorId: currentUserId,
        task: { createdBy: selectedTask.createdBy, assigneeId: selectedTask.assigneeId },
      })
    : false;

  return (
    <div className="board-view">
      <ProgressSummary
        members={members}
        tasks={tasks}
        selectedCompleterId={completionFilter}
        onSelectCompleter={(userId) => {
          setCompletionFilter(userId);
          if (userId) setAssigneeFilter("all");
        }}
      />
      <div className="board-toolbar">
        <div className="connection-state" role="status" aria-live="polite" title={connected ? "Realtime connected" : "Realtime reconnecting"}>
          <span data-connected={connected} />
          {connected ? "Live" : "Reconnecting"}
        </div>
        <label className="assignee-filter">
          <ListFilter size={14} strokeWidth={1.7} />
          <span className="sr-only">Filter by assignee</span>
          <select value={assigneeFilter} onChange={(event) => {
            setAssigneeFilter(event.target.value);
            setCompletionFilter(null);
          }}>
            <option value="all">All assignees</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>{member.profile.displayName}</option>
            ))}
          </select>
        </label>
        {completionFilter && (
          <button className="active-filter" type="button" onClick={() => setCompletionFilter(null)}>
            Done by {members.find((member) => member.userId === completionFilter)?.profile.displayName ?? "member"} ×
          </button>
        )}
        <button
          className="primary-button compact"
          type="button"
          disabled={!mayCreate}
          title={!mayCreate ? "Viewers cannot create requirements" : "New requirement (N)"}
          onClick={() => setSelectedTask(null)}
        >
          <Plus size={14} strokeWidth={1.8} />
          New requirement
        </button>
      </div>
      <DndContext collisionDetection={closestCorners} onDragEnd={(event) => void onDragEnd(event)} sensors={sensors}>
        <div className="board-columns">
          {statuses.map((status) => (
            <TaskColumn
              canMoveTask={canMoveTask}
              key={status}
              members={members}
              onOpenTask={(task) => setSelectedTask(task)}
              status={status}
              tasks={filteredTasks.filter((task) => task.status === status).sort((left, right) => left.position - right.position)}
            />
          ))}
        </div>
      </DndContext>
      {selectedTask !== undefined && (
        <TaskDrawer
          key={selectedTask?.id ?? "new"}
          canDelete={Boolean(selectedCanDelete)}
          canEdit={Boolean(selectedCanEdit)}
          members={members}
          onClose={() => setSelectedTask(undefined)}
          onDelete={selectedTask ? removeSelectedTask : null}
          onSave={saveTask}
          task={selectedTask}
        />
      )}
    </div>
  );
}
