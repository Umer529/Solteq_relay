"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
} from "lucide-react";
import type { Membership, Task } from "@relay/shared";

interface LateDoneItem {
  task: Task;
  dueDate: string;
  completedAt: string;
  daysLate: number;
}

interface OverdueItem {
  task: Task;
  dueDate: string;
  daysOverdue: number;
}

export interface MemberDeliveryAnalysis {
  member: Membership;
  assignedCount: number;
  completedCount: number;
  onTimeCompletedCount: number;
  lateDoneTasks: LateDoneItem[];
  currentlyOverdueTasks: OverdueItem[];
  onTimeRate: number; // percentage 0-100
}

export function OwnerDeliveryReport({
  tasks,
  members,
  onSelectTask,
}: {
  tasks: Task[];
  members: Membership[];
  onSelectTask?: (task: Task) => void;
}) {
  const [filterMode, setFilterMode] = useState<"all" | "late_only">("all");
  const [expandedMemberIds, setExpandedMemberIds] = useState<Record<string, boolean>>({});

  const analysis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const memberStats: MemberDeliveryAnalysis[] = members.map((member) => {
      const memberId = member.userId;

      // Tasks where member is assignee or completed
      const assigned = tasks.filter((t) => t.assigneeId === memberId);
      const completedByMember = tasks.filter(
        (t) => t.status === "done" && (t.completedBy === memberId || (!t.completedBy && t.assigneeId === memberId)),
      );

      const lateDoneTasks: LateDoneItem[] = [];
      let onTimeCompletedCount = 0;

      for (const task of completedByMember) {
        if (!task.dueDate) {
          onTimeCompletedCount++;
          continue;
        }

        const completedDate = task.completedAt ? task.completedAt.slice(0, 10) : today;
        if (completedDate > task.dueDate) {
          const dueTime = new Date(task.dueDate + "T23:59:59").getTime();
          const compTime = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
          const daysLate = Math.max(1, Math.ceil((compTime - dueTime) / 86400000));
          lateDoneTasks.push({
            task,
            dueDate: task.dueDate,
            completedAt: completedDate,
            daysLate,
          });
        } else {
          onTimeCompletedCount++;
        }
      }

      // Tasks assigned to member that are NOT done and dueDate < today
      const currentlyOverdueTasks: OverdueItem[] = [];
      for (const task of assigned) {
        if (task.status !== "done" && task.dueDate && task.dueDate < today) {
          const dueTime = new Date(task.dueDate + "T23:59:59").getTime();
          const daysOverdue = Math.max(1, Math.ceil((Date.now() - dueTime) / 86400000));
          currentlyOverdueTasks.push({
            task,
            dueDate: task.dueDate,
            daysOverdue,
          });
        }
      }

      const totalDatedDone = completedByMember.filter((t) => Boolean(t.dueDate)).length;
      const onTimeRate =
        totalDatedDone > 0
          ? Math.round(((totalDatedDone - lateDoneTasks.length) / totalDatedDone) * 100)
          : 100;

      return {
        member,
        assignedCount: assigned.length,
        completedCount: completedByMember.length,
        onTimeCompletedCount,
        lateDoneTasks,
        currentlyOverdueTasks,
        onTimeRate,
      };
    });

    // Project-wide aggregates
    const totalDone = tasks.filter((t) => t.status === "done").length;
    const totalLateDone = memberStats.reduce((acc, m) => acc + m.lateDoneTasks.length, 0);
    const totalOverdue = memberStats.reduce((acc, m) => acc + m.currentlyOverdueTasks.length, 0);
    const membersWithIssues = memberStats.filter(
      (m) => m.lateDoneTasks.length > 0 || m.currentlyOverdueTasks.length > 0,
    ).length;

    return {
      memberStats,
      totalDone,
      totalLateDone,
      totalOverdue,
      membersWithIssues,
    };
  }, [members, tasks]);

  function toggleMemberExpand(userId: string) {
    setExpandedMemberIds((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }

  const displayedMembers = useMemo(() => {
    if (filterMode === "late_only") {
      return analysis.memberStats.filter(
        (m) => m.lateDoneTasks.length > 0 || m.currentlyOverdueTasks.length > 0,
      );
    }
    return analysis.memberStats;
  }, [analysis.memberStats, filterMode]);

  return (
    <section className="owner-delivery-report" aria-label="Owner member delivery analytics">
      <div className="report-header">
        <div className="report-title-col">
          <div className="report-badge-wrap">
            <span className="owner-crown-badge">
              <Crown size={13} />
              <span>Owner Intelligence</span>
            </span>
          </div>
          <h3>Member Delivery & Late Tasks Audit</h3>
          <p>
            Detailed performance tracking: inspect tasks completed past deadline and currently
            overdue items per member.
          </p>
        </div>

        <div className="report-filter-controls">
          <button
            type="button"
            className={`report-filter-btn ${filterMode === "all" ? "active" : ""}`}
            onClick={() => setFilterMode("all")}
          >
            <span>All Members ({analysis.memberStats.length})</span>
          </button>
          <button
            type="button"
            className={`report-filter-btn ${filterMode === "late_only" ? "active" : ""}`}
            onClick={() => setFilterMode("late_only")}
          >
            <AlertTriangle size={13} className="text-amber" />
            <span>Needs Attention ({analysis.membersWithIssues})</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI cards */}
      <div className="delivery-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Completed Requirements</span>
          <strong className="kpi-val text-emerald">{analysis.totalDone}</strong>
          <span className="kpi-hint">Total delivered across project</span>
        </div>

        <div className={`kpi-card ${analysis.totalLateDone > 0 ? "kpi-warning" : ""}`}>
          <div className="kpi-label-row">
            <span className="kpi-label">Completed Late</span>
            <Clock size={14} className="text-amber" />
          </div>
          <strong className="kpi-val text-amber">{analysis.totalLateDone}</strong>
          <span className="kpi-hint">Finished past task due date</span>
        </div>

        <div className={`kpi-card ${analysis.totalOverdue > 0 ? "kpi-danger" : ""}`}>
          <div className="kpi-label-row">
            <span className="kpi-label">Currently Overdue</span>
            <AlertTriangle size={14} className="text-rose" />
          </div>
          <strong className="kpi-val text-rose">{analysis.totalOverdue}</strong>
          <span className="kpi-hint">Incomplete & past deadline</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Project Delivery Health</span>
          <strong className="kpi-val text-blue">
            {analysis.totalDone > 0
              ? `${Math.max(0, Math.round(((analysis.totalDone - analysis.totalLateDone) / analysis.totalDone) * 100))}%`
              : "100%"}
          </strong>
          <span className="kpi-hint">On-time completion rate</span>
        </div>
      </div>

      {/* Member Details List */}
      <div className="member-delivery-list">
        {displayedMembers.length === 0 ? (
          <div className="delivery-empty-state">
            <CheckCircle2 size={24} className="text-emerald" />
            <strong>No late or overdue tasks!</strong>
            <p>Every team member has delivered requirements on schedule.</p>
          </div>
        ) : (
          displayedMembers.map((stat) => {
            const hasIssues =
              stat.lateDoneTasks.length > 0 || stat.currentlyOverdueTasks.length > 0;
            const isExpanded =
              expandedMemberIds[stat.member.userId] ?? hasIssues; // Auto-expand members with issues

            return (
              <article
                key={stat.member.userId}
                className={`member-delivery-card ${hasIssues ? "has-late-tasks" : ""}`}
              >
                <div
                  className="member-card-header"
                  onClick={() => toggleMemberExpand(stat.member.userId)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                >
                  <div className="member-info-col">
                    <div
                      className="member-avatar-lg"
                      style={{ backgroundColor: stat.member.profile.avatarColor }}
                    >
                      {stat.member.profile.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="name-role-row">
                        <strong>{stat.member.profile.displayName}</strong>
                        <span className={`role-badge role-${stat.member.role}`}>
                          {stat.member.role}
                        </span>
                      </div>
                      <small className="member-email">{stat.member.profile.email}</small>
                    </div>
                  </div>

                  <div className="member-stats-row">
                    <div className="stat-pill">
                      <span className="pill-num">{stat.completedCount}</span>
                      <span className="pill-txt">Completed</span>
                    </div>

                    <div
                      className={`stat-pill ${
                        stat.lateDoneTasks.length > 0 ? "pill-warning" : "pill-muted"
                      }`}
                    >
                      <Clock size={13} />
                      <span className="pill-num">{stat.lateDoneTasks.length}</span>
                      <span className="pill-txt">Late Done</span>
                    </div>

                    <div
                      className={`stat-pill ${
                        stat.currentlyOverdueTasks.length > 0 ? "pill-danger" : "pill-muted"
                      }`}
                    >
                      <AlertTriangle size={13} />
                      <span className="pill-num">{stat.currentlyOverdueTasks.length}</span>
                      <span className="pill-txt">Overdue</span>
                    </div>

                    <div className="stat-pill pill-rate">
                      <span className="pill-num">{stat.onTimeRate}%</span>
                      <span className="pill-txt">On-Time</span>
                    </div>

                    <button
                      type="button"
                      className="expand-arrow-btn"
                      aria-label={isExpanded ? "Collapse member details" : "Expand member details"}
                    >
                      {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                    </button>
                  </div>
                </div>

                {/* Expanded details: late tasks and overdue tasks */}
                {isExpanded && (
                  <div className="member-expanded-details">
                    {/* Late Completed Tasks Section */}
                    {stat.lateDoneTasks.length > 0 && (
                      <div className="sub-tasks-section late-completed">
                        <div className="sub-section-title">
                          <Clock size={14} className="text-amber" />
                          <span>Tasks Completed Late ({stat.lateDoneTasks.length})</span>
                        </div>
                        <div className="sub-tasks-list">
                          {stat.lateDoneTasks.map(({ task, dueDate, completedAt, daysLate }) => (
                            <div
                              key={task.id}
                              className="sub-task-row"
                              onClick={() => onSelectTask?.(task)}
                            >
                              <div className="sub-task-title-group">
                                <span className={`task-priority-dot ${task.priority}`} />
                                <strong className="sub-task-name">{task.title}</strong>
                              </div>
                              <div className="sub-task-meta-group">
                                <span className="date-badge due">
                                  Due: {dueDate}
                                </span>
                                <span className="date-badge completed">
                                  Done: {completedAt}
                                </span>
                                <span className="delay-badge late">
                                  +{daysLate} {daysLate === 1 ? "day" : "days"} late
                                </span>
                                {onSelectTask && (
                                  <button
                                    type="button"
                                    className="inspect-task-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectTask(task);
                                    }}
                                  >
                                    View
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Currently Overdue Tasks Section */}
                    {stat.currentlyOverdueTasks.length > 0 && (
                      <div className="sub-tasks-section currently-overdue">
                        <div className="sub-section-title">
                          <AlertTriangle size={14} className="text-rose" />
                          <span>Currently Overdue & Incomplete ({stat.currentlyOverdueTasks.length})</span>
                        </div>
                        <div className="sub-tasks-list">
                          {stat.currentlyOverdueTasks.map(({ task, dueDate, daysOverdue }) => (
                            <div
                              key={task.id}
                              className="sub-task-row"
                              onClick={() => onSelectTask?.(task)}
                            >
                              <div className="sub-task-title-group">
                                <span className={`task-priority-dot ${task.priority}`} />
                                <strong className="sub-task-name">{task.title}</strong>
                                <span className={`status-pill ${task.status}`}>
                                  {task.status.replace("_", " ")}
                                </span>
                              </div>
                              <div className="sub-task-meta-group">
                                <span className="date-badge due overdue">
                                  Deadline: {dueDate}
                                </span>
                                <span className="delay-badge overdue">
                                  {daysOverdue} {daysOverdue === 1 ? "day" : "days"} overdue
                                </span>
                                {onSelectTask && (
                                  <button
                                    type="button"
                                    className="inspect-task-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectTask(task);
                                    }}
                                  >
                                    View
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Late Tasks for this member */}
                    {stat.lateDoneTasks.length === 0 && stat.currentlyOverdueTasks.length === 0 && (
                      <div className="member-clean-record">
                        <CheckCircle2 size={16} className="text-emerald" />
                        <span>Clean record — all completed requirements delivered on time!</span>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
