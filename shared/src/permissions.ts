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
  "message.edit",
  "message.delete",
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
  message?: { userId: string };
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
  if (action === "message.edit") {
    return role !== "viewer" && ctx?.message?.userId === ctx?.actorId;
  }
  if (action === "message.delete") {
    return role === "owner" || role === "admin" ||
      (role === "member" && ctx?.message?.userId === ctx?.actorId);
  }

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
    if (action === "task.changeStatus") {
      return Boolean(ctx?.task && ctx.task.assigneeId === ctx.actorId);
    }
    return contributorActions.has(action);
  }

  return false;
}

export interface RoleBoundary {
  role: ProjectRole;
  title: string;
  tagline: string;
  canCreateTasks: boolean;
  canAssignToOwner: boolean;
  canManageMembers: boolean;
  canDeleteProject: boolean;
  summary: string;
  rules: string[];
}

export const ROLE_BOUNDARIES: Record<ProjectRole, RoleBoundary> = {
  owner: {
    role: "owner",
    title: "Project Owner",
    tagline: "Product lead & backlog authority",
    canCreateTasks: true,
    canAssignToOwner: true,
    canManageMembers: true,
    canDeleteProject: true,
    summary: "Full authority over project roadmap, membership, and task allocations.",
    rules: [
      "Can create, edit, and delete any requirement or task",
      "Can assign tasks to any member, admin, or self",
      "Can manage project roles, add/remove members, and delete project",
    ],
  },
  admin: {
    role: "admin",
    title: "Project Admin",
    tagline: "Execution manager & team coordinator",
    canCreateTasks: true,
    canAssignToOwner: true,
    canManageMembers: true,
    canDeleteProject: false,
    summary: "Manages day-to-day operations, task delegations, and team collaboration.",
    rules: [
      "Can create, edit, and delete requirements",
      "Can assign tasks to any team member",
      "Can invite members and adjust member roles (cannot modify owner or delete project)",
    ],
  },
  member: {
    role: "member",
    title: "Project Member",
    tagline: "Contributor & task executor",
    canCreateTasks: true,
    canAssignToOwner: false,
    canManageMembers: false,
    canDeleteProject: false,
    summary: "Delivers assigned tasks and collaborates with the project team.",
    rules: [
      "Cannot assign requirements or tasks to Project Owner or Admins",
      "Can create tasks assigned to self or leave unassigned for triage",
      "Can move assigned tasks across board stages (Todo, In Progress, Done)",
      "Can edit tasks they created or are assigned to",
    ],
  },
  viewer: {
    role: "viewer",
    title: "Project Viewer",
    tagline: "Stakeholder & observer",
    canCreateTasks: false,
    canAssignToOwner: false,
    canManageMembers: false,
    canDeleteProject: false,
    summary: "Observes project progress, requirements, and discussions without mutation rights.",
    rules: [
      "Read-only access to board, tasks, and activity",
      "Cannot create, edit, delete, or move tasks",
      "Cannot assign tasks or post chat messages",
    ],
  },
};

export function canAssignTask(
  actorRole: ProjectRole,
  targetRole: ProjectRole | null | undefined,
): boolean {
  if (!targetRole) return true;
  if (actorRole === "owner" || actorRole === "admin") return true;
  if (actorRole === "member") {
    return targetRole !== "owner" && targetRole !== "admin";
  }
  return false;
}

