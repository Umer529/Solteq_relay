export const projectRoles = ["owner", "admin", "member", "viewer"] as const;
export type ProjectRole = (typeof projectRoles)[number];

export const actions = [
  "project.delete",
  "project.update",
  "member.invite",
  "member.remove",
  "member.changeRole",
  "task.create",
  "task.edit",
  "task.delete",
  "task.changeStatus",
  "message.post",
  "project.view",
] as const;

export type Action = (typeof actions)[number];

export interface PermissionTask {
  createdBy: string;
  assigneeId: string | null;
}

export interface PermissionContext {
  actorId: string;
  targetUserId?: string;
  /** Requested role for a role change; current role for a removal. */
  targetRole?: ProjectRole;
  currentTargetRole?: ProjectRole;
  ownerCount?: number;
  task?: PermissionTask;
}

const elevatedActions = new Set<Action>([
  "project.update",
  "member.invite",
  "task.create",
  "task.edit",
  "task.delete",
  "task.changeStatus",
  "message.post",
  "project.view",
]);

const contributorActions = new Set<Action>([
  "task.create",
  "task.changeStatus",
  "message.post",
  "project.view",
]);

const lowerRoles = new Set<ProjectRole>(["member", "viewer"]);

function preservesOwner(ctx: PermissionContext | undefined): boolean {
  const currentRole = ctx?.currentTargetRole ?? ctx?.targetRole;
  return currentRole !== "owner" || ctx?.ownerCount === undefined || ctx.ownerCount > 1;
}

export function can(
  role: ProjectRole,
  action: Action,
  ctx?: PermissionContext,
): boolean {
  if (action === "project.view") return true;

  if (role === "owner") {
    if (action === "member.remove" || action === "member.changeRole") {
      return preservesOwner(ctx);
    }
    return true;
  }

  if (role === "admin") {
    if (action === "project.delete") return false;
    if (action === "member.remove") {
      return Boolean(ctx?.targetRole && lowerRoles.has(ctx.targetRole));
    }
    if (action === "member.changeRole") {
      return Boolean(
        ctx?.currentTargetRole &&
          lowerRoles.has(ctx.currentTargetRole) &&
          ctx.targetRole &&
          lowerRoles.has(ctx.targetRole),
      );
    }
    return elevatedActions.has(action);
  }

  if (role === "member") {
    if (action === "task.edit") {
      return Boolean(
        ctx?.task &&
          (ctx.task.createdBy === ctx.actorId || ctx.task.assigneeId === ctx.actorId),
      );
    }
    if (action === "task.delete") {
      return Boolean(ctx?.task && ctx.task.createdBy === ctx.actorId);
    }
    return contributorActions.has(action);
  }

  return false;
}
