"use client";

import { Crown, Shield, ShieldCheck, Eye, ShieldAlert, Check, X } from "lucide-react";
import { ROLE_BOUNDARIES, type ProjectRole } from "@relay/shared";

const ROLE_ICONS: Record<ProjectRole, React.ComponentType<{ size?: number; className?: string }>> = {
  owner: Crown,
  admin: ShieldCheck,
  member: Shield,
  viewer: Eye,
};

export function RoleBoundariesGuide({
  currentRole,
  compact = false,
}: {
  currentRole?: ProjectRole;
  compact?: boolean;
}) {
  const roles: ProjectRole[] = ["owner", "admin", "member", "viewer"];

  if (compact) {
    return (
      <div className="role-boundary-callout">
        <div className="boundary-callout-header">
          <ShieldAlert size={15} className="boundary-icon-alert" />
          <strong>Project Role Boundary Policy</strong>
        </div>
        <p>
          Members can create requirements and move assigned tasks, but{" "}
          <strong>cannot assign requirements to Project Owners or Admins</strong>. Only Owners and
          Admins have authority to allocate requirements to Owners.
        </p>
      </div>
    );
  }

  return (
    <section className="role-boundaries-section">
      <div className="role-boundaries-header">
        <div className="header-icon-wrap">
          <ShieldCheck size={18} />
        </div>
        <div>
          <h3>Project Role Boundaries & Permissions</h3>
          <p>Clear boundaries ensure accountability, roadmap governance, and team alignment.</p>
        </div>
      </div>

      <div className="role-boundaries-grid">
        {roles.map((roleKey) => {
          const info = ROLE_BOUNDARIES[roleKey];
          const Icon = ROLE_ICONS[roleKey];
          const isCurrent = currentRole === roleKey;

          return (
            <article
              key={roleKey}
              className={`role-boundary-card role-${roleKey} ${isCurrent ? "is-current-user" : ""}`}
            >
              <div className="card-top">
                <span className={`role-badge role-${roleKey}`}>
                  <Icon size={12} />
                  <span>{info.title}</span>
                </span>
                {isCurrent && <span className="current-user-tag">Your role</span>}
              </div>

              <strong className="role-tagline">{info.tagline}</strong>
              <p className="role-summary">{info.summary}</p>

              <div className="boundary-matrix">
                <div className="matrix-row">
                  <span>Create requirements</span>
                  {info.canCreateTasks ? (
                    <Check size={14} className="matrix-icon ok" />
                  ) : (
                    <X size={14} className="matrix-icon blocked" />
                  )}
                </div>
                <div className="matrix-row">
                  <span>Assign tasks to Owner</span>
                  {info.canAssignToOwner ? (
                    <Check size={14} className="matrix-icon ok" />
                  ) : (
                    <span className="matrix-restricted">
                      <X size={13} className="matrix-icon blocked" />
                      <em>Restricted</em>
                    </span>
                  )}
                </div>
                <div className="matrix-row">
                  <span>Manage members</span>
                  {info.canManageMembers ? (
                    <Check size={14} className="matrix-icon ok" />
                  ) : (
                    <X size={14} className="matrix-icon blocked" />
                  )}
                </div>
              </div>

              <ul className="role-rules-list">
                {info.rules.map((rule, idx) => (
                  <li key={idx}>
                    <span className="rule-bullet" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
