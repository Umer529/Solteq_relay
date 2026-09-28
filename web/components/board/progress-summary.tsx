"use client";

import type { Membership, Task } from "@relay/shared";

export function ProgressSummary({
  tasks,
  members,
  selectedCompleterId,
  onSelectCompleter,
}: {
  tasks: Task[];
  members: Membership[];
  selectedCompleterId: string | null;
  onSelectCompleter: (userId: string | null) => void;
}) {
  const done = tasks.filter((task) => task.status === "done");
  const percent = tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);
  const contributions = members
    .map((member) => ({
      member,
      completed: done.filter((task) => task.completedBy === member.userId).length,
    }))
    .filter((item) => item.completed > 0)
    .sort((left, right) => right.completed - left.completed);

  return (
    <section className="progress-summary" aria-label="Project progress">
      <div className="progress-copy">
        <strong><span>{done.length}</span> of <span>{tasks.length}</span> requirements done</strong>
        <small>{percent}% complete</small>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="contributions" aria-label="Completed requirements by member">
        {contributions.slice(0, 5).map(({ member, completed }) => (
          <button
            className={selectedCompleterId === member.userId ? "selected" : undefined}
            key={member.userId}
            type="button"
            aria-pressed={selectedCompleterId === member.userId}
            title={`Show ${completed} completed by ${member.profile.displayName}`}
            onClick={() => onSelectCompleter(selectedCompleterId === member.userId ? null : member.userId)}
          >
            <i style={{ backgroundColor: member.profile.avatarColor }}>
              {member.profile.displayName.charAt(0).toUpperCase()}
            </i>
            <b>{completed}</b>
          </button>
        ))}
        {contributions.length === 0 && <small>No completions yet</small>}
      </div>
    </section>
  );
}
