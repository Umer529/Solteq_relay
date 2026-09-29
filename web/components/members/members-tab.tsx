"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { can, projectRoles, type ProjectRole } from "@relay/shared";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useProjectContext } from "@/components/projects/project-provider";
import { useProjectStore } from "@/store/project-store";
import { PresenceDot } from "@/components/presence/presence-dot";
import { addProjectMember, changeProjectMemberRole, removeProjectMember } from "@/lib/browser-api";

export function MembersTab({ notice }: { notice?: { error?: string; message?: string } }) {
  const router = useRouter();
  const { projectId, currentUserId, initialSnapshot } = useProjectContext();
  const storeProjectId = useProjectStore((state) => state.projectId);
  const storedMembers = useProjectStore((state) => state.members);
  const members =
    storeProjectId === projectId && storedMembers.length > 0
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

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyUserIds, setBusyUserIds] = useState<Record<string, boolean>>({});

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setIsSubmitting(true);
    try {
      const added = await addProjectMember(projectId, {
        email: cleanEmail,
        role,
      });
      useProjectStore.getState().upsertMember(added);
      setEmail("");
      setRole("member");
      toast.success(`${added.profile.displayName || added.profile.email} added to project!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangeRole(userId: string, newRole: ProjectRole) {
    setBusyUserIds((prev) => ({ ...prev, [userId]: true }));
    try {
      await changeProjectMemberRole(projectId, userId, newRole);
      const existing = members.find((m) => m.userId === userId);
      if (existing) {
        useProjectStore.getState().upsertMember({
          ...existing,
          role: newRole,
        });
      }
      toast.success("Role updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role.");
    } finally {
      setBusyUserIds((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function handleRemoveMember(userId: string, isSelf: boolean) {
    const confirmMessage = isSelf
      ? "Are you sure you want to leave this project?"
      : "Are you sure you want to remove this member from the project?";
    if (!window.confirm(confirmMessage)) return;

    setBusyUserIds((prev) => ({ ...prev, [userId]: true }));
    try {
      await removeProjectMember(projectId, userId);
      useProjectStore.getState().removeMember(userId);
      toast.success(isSelf ? "You left the project." : "Member removed from project.");
      if (isSelf) {
        router.replace("/projects");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove member.");
    } finally {
      setBusyUserIds((prev) => ({ ...prev, [userId]: false }));
    }
  }

  return (
    <div className="members-view">
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
        <div className="section-icon" aria-hidden="true">
          <UserPlus size={17} strokeWidth={1.6} />
        </div>
        <div className="invite-copy">
          <h3 id="invite-heading">Add a teammate</h3>
          <p>
            {mayInvite
              ? "Add a member to this project by email."
              : "Only project owners and admins can invite new members."}
          </p>
        </div>
        {mayInvite ? (
          <form className="invite-form" onSubmit={handleAddMember}>
            <input
              aria-label="Teammate email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <select
              aria-label="Initial role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as ProjectRole)}
              disabled={isSubmitting}
            >
              {inviteRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="primary-button compact"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding…" : "Add member"}
            </button>
          </form>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.5rem 0",
              color: "var(--foreground-muted, #94a3b8)",
              fontSize: "0.875rem",
            }}
          >
            <span
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "9999px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
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
          const isBusy = !!busyUserIds[member.userId];

          return (
            <article className="member-row" key={member.userId}>
              <div className="member-avatar" style={{ backgroundColor: member.profile.avatarColor }}>
                {member.profile.displayName.charAt(0).toUpperCase()}
                <PresenceDot userId={member.userId} />
              </div>
              <div className="member-identity">
                <strong>
                  {member.profile.displayName}
                  {isSelf ? " (you)" : ""}
                </strong>
                <span>{member.profile.email}</span>
              </div>
              <form
                className="role-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const select = form.elements.namedItem("role") as HTMLSelectElement;
                  const newRole = select?.value as ProjectRole;
                  if (newRole && newRole !== member.role) {
                    void handleChangeRole(member.userId, newRole);
                  }
                }}
              >
                <select
                  aria-label={`Role for ${member.profile.displayName}`}
                  name="role"
                  defaultValue={member.role}
                  disabled={!mayChange || isBusy}
                  title={!mayChange ? roleReason : "Change project role"}
                >
                  {!allowedRoles.includes(member.role) && <option value={member.role}>{member.role}</option>}
                  {allowedRoles.map((roleOption: ProjectRole) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!mayChange || isBusy}
                  title={!mayChange ? roleReason : "Save role"}
                >
                  {isBusy ? "Saving…" : "Save"}
                </button>
              </form>
              <button
                type="button"
                className="danger-link"
                disabled={!mayRemove || isBusy}
                onClick={() => handleRemoveMember(member.userId, isSelf)}
                title={
                  !mayRemove
                    ? lastOwner
                      ? "The last owner cannot leave"
                      : "You cannot remove this member"
                    : undefined
                }
              >
                {isBusy ? (isSelf ? "Leaving…" : "Removing…") : isSelf ? "Leave" : "Remove"}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
