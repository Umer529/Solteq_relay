import { Router } from "express";
import {
  can,
  changeMemberRoleSchema,
  createProjectSchema,
  inviteMemberSchema,
  projectIdSchema,
  updateProjectSchema,
  userIdSchema,
} from "@relay/shared";
import { authenticate } from "../middleware/authenticate.js";
import { requireMember } from "../middleware/require-member.js";
import { AppError } from "../lib/errors.js";
import {
  addMember,
  changeMemberRole,
  createProject,
  createUserAndProfile,
  deleteProject,
  findProfileByEmail,
  getMembership,
  getOwnerCount,
  removeMember,
  updateProject,
} from "../services/projects.js";

export const projectsRouter = Router();

function actor(request: Express.Request) {
  if (!request.user) throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  return request.user;
}

function membership(request: Express.Request) {
  if (!request.membership) throw new AppError(403, "FORBIDDEN", "Project membership is required.");
  return request.membership;
}

projectsRouter.use(authenticate);

projectsRouter.post("/", async (request, response) => {
  const input = createProjectSchema.parse(request.body);
  const project = await createProject(input, actor(request).id);
  response.status(201).json({ data: project });
});

projectsRouter.patch("/:id", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const input = updateProjectSchema.parse(request.body);
  const user = actor(request);
  const member = membership(request);
  if (!can(member.role, "project.update", { actorId: user.id })) {
    throw new AppError(403, "FORBIDDEN", "Only project owners and admins can update this project.");
  }

  response.json({ data: await updateProject(projectId, input, user.id) });
});

projectsRouter.delete("/:id", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const user = actor(request);
  const member = membership(request);
  if (!can(member.role, "project.delete", { actorId: user.id })) {
    throw new AppError(403, "FORBIDDEN", "Only a project owner can delete this project.");
  }

  await deleteProject(projectId, user.id);
  response.status(204).send();
});

projectsRouter.post("/:id/members", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const input = inviteMemberSchema.parse(request.body);
  const user = actor(request);
  const member = membership(request);
  const mayInvite = can(member.role, "member.invite", { actorId: user.id });
  const mayGrantRole =
    member.role !== "admin" ||
    can("admin", "member.changeRole", {
      actorId: user.id,
      currentTargetRole: "viewer",
      targetRole: input.role,
    });
  if (!mayInvite) {
    throw new AppError(403, "FORBIDDEN", "Only project owners and admins can add members.");
  }
  if (!mayGrantRole) {
    throw new AppError(403, "FORBIDDEN", "Admins cannot assign the owner role.");
  }

  let profile = await findProfileByEmail(input.email).catch(() => null);

  if (!profile) {
    if (!input.password || input.password.trim().length < 6) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "A password of at least 6 characters is required to create an account for this new member.",
      );
    }
    profile = await createUserAndProfile(input.email, input.password, input.displayName);
  }

  const created = await addMember(projectId, profile.id, input.role, user.id);
  const membershipData = {
    projectId,
    userId: profile.id,
    role: input.role,
    createdAt: (created as { created_at?: string })?.created_at ?? new Date().toISOString(),
    profile: {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      avatarColor: profile.avatar_color,
    },
  };
  response.status(201).json({ data: membershipData });
});

projectsRouter.patch("/:id/members/:userId", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const targetUserId = userIdSchema.parse(request.params.userId);
  const input = changeMemberRoleSchema.parse(request.body);
  const user = actor(request);
  const member = membership(request);
  const target = await getMembership(projectId, targetUserId);
  const ownerCount = target.role === "owner" ? await getOwnerCount(projectId) : undefined;

  if (target.role === "owner" && input.role !== "owner" && ownerCount === 1) {
    throw new AppError(409, "CONFLICT", "A project must always have at least one owner.");
  }
  if (
    !can(member.role, "member.changeRole", {
      actorId: user.id,
      targetUserId,
      targetRole: input.role,
      currentTargetRole: target.role,
      ownerCount,
    })
  ) {
    throw new AppError(403, "FORBIDDEN", "You cannot change this member's role.");
  }

  response.json({ data: await changeMemberRole(projectId, targetUserId, input.role, user.id) });
});

projectsRouter.delete("/:id/members/:userId", requireMember, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.id);
  const targetUserId = userIdSchema.parse(request.params.userId);
  const user = actor(request);
  const member = membership(request);
  const target = await getMembership(projectId, targetUserId);
  const ownerCount = target.role === "owner" ? await getOwnerCount(projectId) : undefined;

  if (target.role === "owner" && ownerCount === 1) {
    throw new AppError(409, "CONFLICT", "The last owner cannot leave or be removed.");
  }

  const leavingSelf = targetUserId === user.id;
  if (
    !leavingSelf &&
    !can(member.role, "member.remove", {
      actorId: user.id,
      targetUserId,
      targetRole: target.role,
      ownerCount,
    })
  ) {
    throw new AppError(403, "FORBIDDEN", "You cannot remove this project member.");
  }

  await removeMember(projectId, targetUserId, user.id);
  response.status(204).send();
});
