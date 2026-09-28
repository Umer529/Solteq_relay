"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Membership, Task, TaskStatus } from "@relay/shared";
import { TaskCard } from "./task-card";

const labels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function TaskColumn({
  status,
  tasks,
  members,
  dragDisabled,
  onOpenTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  members: Membership[];
  dragDisabled: boolean;
  onOpenTask: (task: Task) => void;
}) {
  const droppable = useDroppable({ id: `column:${status}` });

  return (
    <section className={`board-column${droppable.isOver ? " over" : ""}`} ref={droppable.setNodeRef}>
      <header className="column-header">
        <span className={`status-dot status-${status}`} />
        <h3>{labels[status]}</h3>
        <span className="column-count">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              disabled={dragDisabled}
              key={task.id}
              members={members}
              onOpen={() => onOpenTask(task)}
              task={task}
            />
          ))}
          {tasks.length === 0 && <p className="column-empty">Drop a requirement here</p>}
        </div>
      </SortableContext>
    </section>
  );
}
