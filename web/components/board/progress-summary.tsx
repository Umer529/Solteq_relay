"use client";

import type { Membership, Task } from "@relay/shared";

export function ProgressSummary({ tasks, members }: { tasks: Task[]; members: Membership[] }) {
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
          <span key={member.userId} title={`${member.profile.displayName}: ${completed} completed`}>
            <i style={{ backgroundColor: member.profile.avatarColor }}>
              {member.profile.displayName.charAt(0).toUpperCase()}
            </i>
            <b>{completed}</b>
          </span>
        ))}
        {contributions.length === 0 && <small>No completions yet</small>}
      </div>
    </section>
  );
}
