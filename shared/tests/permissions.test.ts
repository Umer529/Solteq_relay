import { describe, expect, it } from "vitest";
import { actions, can, type Action, type PermissionContext, type ProjectRole } from "../src/permissions.js";

const actorId = "actor";
const baseContext: PermissionContext = {
  actorId,
  targetUserId: "target",
  targetRole: "member",
  currentTargetRole: "member",
  ownerCount: 2,
  task: { createdBy: actorId, assigneeId: null },
  message: { userId: actorId },
};

const expected: Record<ProjectRole, Record<Action, boolean>> = {
  owner: Object.fromEntries(actions.map((action) => [action, true])) as Record<Action, boolean>,
  admin: {
    "project.delete": false,
    "project.update": true,
    "member.invite": true,
    "member.remove": true,
    "member.changeRole": true,
    "task.create": true,
    "task.edit": true,
    "task.delete": true,
    "task.changeStatus": true,
    "message.post": true,
    "message.edit": true,
    "message.delete": true,
    "project.view": true,
  },
  member: {
    "project.delete": false,
    "project.update": false,
    "member.invite": false,
    "member.remove": false,
    "member.changeRole": false,
    "task.create": true,
    "task.edit": true,
    "task.delete": true,
    "task.changeStatus": true,
    "message.post": true,
    "message.edit": true,
    "message.delete": true,
    "project.view": true,
  },
  viewer: Object.fromEntries(
    actions.map((action) => [action, action === "project.view"]),
  ) as Record<Action, boolean>,
};

describe("can", () => {
  for (const role of ["owner", "admin", "member", "viewer"] as const) {
    it(`covers every permission-matrix row for ${role}`, () => {
      for (const action of actions) {
        expect(can(role, action, baseContext), `${role}: ${action}`).toBe(expected[role][action]);
      }
    });
  }

  it("limits member task edits to the creator or assignee", () => {
    expect(can("member", "task.edit", { actorId, task: { createdBy: "other", assigneeId: actorId } })).toBe(true);
    expect(can("member", "task.edit", { actorId, task: { createdBy: "other", assigneeId: null } })).toBe(false);
    expect(can("member", "task.delete", { actorId, task: { createdBy: "other", assigneeId: actorId } })).toBe(false);
  });

  it("prevents admins from touching elevated memberships", () => {
    expect(can("admin", "member.remove", { actorId, targetRole: "admin" })).toBe(false);
    expect(can("admin", "member.remove", { actorId, targetRole: "owner" })).toBe(false);
    expect(can("admin", "member.changeRole", { actorId, currentTargetRole: "member", targetRole: "admin" })).toBe(false);
    expect(can("admin", "member.changeRole", { actorId, currentTargetRole: "admin", targetRole: "viewer" })).toBe(false);
  });

  it("blocks demoting or removing the last owner", () => {
    const lastOwner = { actorId, currentTargetRole: "owner" as const, targetRole: "member" as const, ownerCount: 1 };
    expect(can("owner", "member.changeRole", lastOwner)).toBe(false);
    expect(can("owner", "member.remove", { ...lastOwner, targetRole: "owner" })).toBe(false);
    expect(can("owner", "member.changeRole", { ...lastOwner, ownerCount: 2 })).toBe(true);
  });

  it("allows authors to edit and moderate roles to delete messages", () => {
    const anotherMessage = { actorId, message: { userId: "other" } };
    expect(can("owner", "message.edit", anotherMessage)).toBe(false);
    expect(can("admin", "message.edit", anotherMessage)).toBe(false);
    expect(can("member", "message.edit", anotherMessage)).toBe(false);
    expect(can("owner", "message.delete", anotherMessage)).toBe(true);
    expect(can("admin", "message.delete", anotherMessage)).toBe(true);
    expect(can("member", "message.delete", anotherMessage)).toBe(false);
  });
});
