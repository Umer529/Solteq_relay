"use client";

import { can, projectRoles, type ProjectRole } from "@relay/shared";
import { UserPlus, Users } from "lucide-react";
import { useProjectContext } from "@/components/projects/project-provider";
import { useProjectStore } from "@/store/project-store";
import { PresenceDot } from "@/components/presence/presence-dot";
import { ProjectRealtimeBridge } from "@/components/presence/project-realtime-bridge";
import { SubmitButton } from "@/components/ui/submit-button";
import { changeRoleAction, inviteMemberAction, removeMemberAction } from "@/app/(app)/projects/actions";

export function MembersTab({ notice }: { notice?: { error?: string; message?: string } }) {
  const { projectId, currentUserId, initialSnapshot } = useProjectContext();
  const storeProjectId = useProjectStore((state) => state.projectId);
  const storedMembers = useProjectStore((state) => state.members);
  const members = storeProjectId === projectId && storedMembers.length > 0
    ? storedMembers
    : initialSnapshot.members;

  const actorMembership = members.find((member) => member.userId === currentUserId);
  const actorRole = actorMembership?.role ?? "viewer";
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const mayInvite = can(actorRole, "member.invite", { actorId: currentUserId });
  const inviteRoles = projectRoles.filter((role) =>
    actorRole === "owner"
      ? true
      : can(actorRole, "member.changeRole", {
          actorId: currentUserId,
          currentTargetRole: "viewer",
          targetRole: role,
        }),
  );

  return (
    <div className="members-view">
      <ProjectRealtimeBridge currentUserId={currentUserId} snapshot={initialSnapshot} />
      <div className="content-heading">
        <div>
          <h2>Members</h2>
          <p>{members.length} people have access to this project.</p>
        </div>
      </div>

      {notice && (notice.error || notice.message) && (
        <div className="form-message" data-tone={notice.error ? "error" : "info"} role="status">
          {notice.error ?? notice.message}
        </div>
      )}

      <section className="invite-panel" aria-labelledby="invite-heading">
        <div className="section-icon" aria-hidden="true"><UserPlus size={17} strokeWidth={1.6} /></div>
        <div className="invite-copy">
          <h3 id="invite-heading">Add a teammate</h3>
          <p>
            {mayInvite
              ? "They must already have a Relay account."
              : "Only project owners and admins can invite new members."}
          </p>
        </div>
        {mayInvite ? (
          <form className="invite-form" action={inviteMemberAction.bind(null, projectId)}>
            <input
              aria-label="Teammate email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
            />
            <select
              aria-label="Initial role"
              name="role"
              defaultValue="member"
            >
              {inviteRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <SubmitButton
              className="primary-button compact"
              pendingLabel="Adding…"
            >
              Add member
            </SubmitButton>
          </form>
        ) : (
          <div style={{ display: "flex", alignItems: "center", padding: "0.5rem 0", color: "var(--foreground-muted, #94a3b8)", fontSize: "0.875rem" }}>
            <span style={{ padding: "0.35rem 0.85rem", borderRadius: "9999px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
              🔒 Owner or Admin role required to add members
            </span>
          </div>
        )}
      </section>

      <section className="member-list" aria-labelledby="member-list-heading">
        <div className="member-list-header">
          <Users size={16} strokeWidth={1.6} />
          <h3 id="member-list-heading">Project access</h3>
        </div>
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const lastOwner = member.role === "owner" && ownerCount === 1;
          const allowedRoles = projectRoles.filter((nextRole) =>
            can(actorRole, "member.changeRole", {
              actorId: currentUserId,
              targetUserId: member.userId,
              currentTargetRole: member.role,
              targetRole: nextRole,
              ownerCount,
            }),
          );
          const mayChange = allowedRoles.length > 0;
          const mayRemove =
            !lastOwner &&
            (isSelf ||
              can(actorRole, "member.remove", {
                actorId: currentUserId,
                targetUserId: member.userId,
                targetRole: member.role,
                ownerCount,
              }));
          const roleReason = lastOwner
            ? "Assign another owner before changing this role"
            : "Only permitted owners or admins can change this role";

          return (
            <article className="member-row" key={member.userId}>
              <div className="member-avatar" style={{ backgroundColor: member.profile.avatarColor }}>
                {member.profile.displayName.charAt(0).toUpperCase()}
                <PresenceDot userId={member.userId} />
              </div>
              <div className="member-identity">
                <strong>{member.profile.displayName}{isSelf ? " (you)" : ""}</strong>
                <span>{member.profile.email}</span>
              </div>
              <form className="role-form" action={changeRoleAction.bind(null, projectId, member.userId)}>
                <select
                  aria-label={`Role for ${member.profile.displayName}`}
                  name="role"
                  defaultValue={member.role}
                  disabled={!mayChange}
                  title={!mayChange ? roleReason : "Change project role"}
                >
                  {!allowedRoles.includes(member.role) && <option value={member.role}>{member.role}</option>}
                  {allowedRoles.map((role: ProjectRole) => <option key={role} value={role}>{role}</option>)}
                </select>
                <SubmitButton disabled={!mayChange} pendingLabel="Saving…" title={!mayChange ? roleReason : "Save role"}>
                  Save
                </SubmitButton>
              </form>
              <form action={removeMemberAction.bind(null, projectId, member.userId)}>
                <SubmitButton
                  className="danger-link"
                  disabled={!mayRemove}
                  pendingLabel={isSelf ? "Leaving…" : "Removing…"}
                  title={!mayRemove ? (lastOwner ? "The last owner cannot leave" : "You cannot remove this member") : undefined}
                >
                  {isSelf ? "Leave" : "Remove"}
                </SubmitButton>
              </form>
            </article>
          );
        })}
      </section>
    </div>
  );
}
