import { can, projectRoles, type ProjectRole } from "@relay/shared";
import { UserPlus, Users } from "lucide-react";
import { changeRoleAction, inviteMemberAction, removeMemberAction } from "../../actions";
import type { ProjectSnapshot } from "@relay/shared";
import { apiRequest } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { PresenceDot } from "@/components/presence/presence-dot";
import { ProjectRealtimeBridge } from "@/components/presence/project-realtime-bridge";
import { SubmitButton } from "@/components/ui/submit-button";

interface MembersPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function MembersPage({ params, searchParams }: MembersPageProps) {
  const { id } = await params;
  const notice = await searchParams;
  const supabase = await createClient();
  const [{ data: { user } }, snapshot] = await Promise.all([
    supabase.auth.getUser(),
    apiRequest<ProjectSnapshot>(`/projects/${id}/snapshot`, { method: "GET" }),
  ]);
  if (!user) return null;
  const members = snapshot.members;

  const actorMembership = members.find((member) => member.userId === user.id);
  if (!actorMembership) return null;
  const actorRole = actorMembership.role;
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const mayInvite = can(actorRole, "member.invite", { actorId: user.id });
  const inviteRoles = projectRoles.filter((role) =>
    actorRole === "owner"
      ? true
      : can(actorRole, "member.changeRole", {
          actorId: user.id,
          currentTargetRole: "viewer",
          targetRole: role,
        }),
  );

  return (
    <div className="members-view">
      <ProjectRealtimeBridge currentUserId={user.id} snapshot={snapshot} />
      <div className="content-heading">
        <div>
          <h2>Members</h2>
          <p>{members.length} people have access to this project.</p>
        </div>
      </div>

      {(notice.error || notice.message) && (
        <div className="form-message" data-tone={notice.error ? "error" : "info"} role="status">
          {notice.error ?? notice.message}
        </div>
      )}

      <section className="invite-panel" aria-labelledby="invite-heading">
        <div className="section-icon" aria-hidden="true"><UserPlus size={17} strokeWidth={1.6} /></div>
        <div className="invite-copy">
          <h3 id="invite-heading">Add a teammate</h3>
          <p>They must already have a Relay account.</p>
        </div>
        <form className="invite-form" action={inviteMemberAction.bind(null, id)}>
          <input
            aria-label="Teammate email"
            name="email"
            type="email"
            placeholder="name@company.com"
            required
            disabled={!mayInvite}
            title={!mayInvite ? "Only owners and admins can add members" : undefined}
          />
          <select
            aria-label="Initial role"
            name="role"
            defaultValue="member"
            disabled={!mayInvite}
            title={!mayInvite ? "Only owners and admins can choose roles" : undefined}
          >
            {inviteRoles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <SubmitButton
            className="primary-button compact"
            disabled={!mayInvite}
            pendingLabel="Adding…"
            title={!mayInvite ? "Only owners and admins can add members" : undefined}
          >
            Add member
          </SubmitButton>
        </form>
      </section>

      <section className="member-list" aria-labelledby="member-list-heading">
        <div className="member-list-header">
          <Users size={16} strokeWidth={1.6} />
          <h3 id="member-list-heading">Project access</h3>
        </div>
        {members.map((member) => {
          const isSelf = member.userId === user.id;
          const lastOwner = member.role === "owner" && ownerCount === 1;
          const allowedRoles = projectRoles.filter((nextRole) =>
            can(actorRole, "member.changeRole", {
              actorId: user.id,
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
                actorId: user.id,
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
              <form className="role-form" action={changeRoleAction.bind(null, id, member.userId)}>
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
              <form action={removeMemberAction.bind(null, id, member.userId)}>
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
