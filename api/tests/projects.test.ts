import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  addMember: vi.fn(),
  changeMemberRole: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  findProfileByEmail: vi.fn(),
  getMembership: vi.fn(),
  getOwnerCount: vi.fn(),
  removeMember: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../src/services/projects.js", () => serviceMocks);

vi.mock("../src/middleware/authenticate.js", () => ({
  authenticate(request_: Request, _response: Response, next: NextFunction) {
    request_.user = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "actor@relay.demo" };
    next();
  },
}));

vi.mock("../src/middleware/require-member.js", () => ({
  requireMember(request_: Request, response: Response, next: NextFunction) {
    const role = request_.header("x-test-role");
    if (!role || role === "none") {
      response.status(403).json({ error: { code: "FORBIDDEN", message: "Not a member." } });
      return;
    }
    request_.membership = {
      projectId: typeof request_.params.id === "string" ? request_.params.id : "",
      role: role as "owner" | "admin" | "member" | "viewer",
    };
    next();
  },
}));

const projectId = "10000000-0000-4000-8000-000000000001";
const targetUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("project and membership routes", () => {
  type CreateApp = typeof import("../src/app.js")["createApp"];
  let app: ReturnType<CreateApp>;

  beforeAll(async () => {
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.WEB_ORIGIN = "http://localhost:3000";
    const { createApp } = await import("../src/app.js");
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getMembership.mockResolvedValue({ role: "member" });
    serviceMocks.getOwnerCount.mockResolvedValue(2);
  });

  it("prevents an admin from promoting a member to owner", async () => {
    const response = await request(app)
      .patch(`/projects/${projectId}/members/${targetUserId}`)
      .set("x-test-role", "admin")
      .send({ role: "owner" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(serviceMocks.changeMemberRole).not.toHaveBeenCalled();
  });

  it("returns a conflict when the last owner is demoted", async () => {
    serviceMocks.getMembership.mockResolvedValue({ role: "owner" });
    serviceMocks.getOwnerCount.mockResolvedValue(1);

    const response = await request(app)
      .patch(`/projects/${projectId}/members/${targetUserId}`)
      .set("x-test-role", "owner")
      .send({ role: "member" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
    expect(serviceMocks.changeMemberRole).not.toHaveBeenCalled();
  });

  it("allows members to leave their project", async () => {
    const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const response = await request(app)
      .delete(`/projects/${projectId}/members/${actorId}`)
      .set("x-test-role", "member");

    expect(response.status).toBe(204);
    expect(serviceMocks.removeMember).toHaveBeenCalledWith(projectId, actorId, actorId);
  });

  it("rejects a non-member on every project-scoped M2 route", async () => {
    const calls = [
      request(app).patch(`/projects/${projectId}`).set("x-test-role", "none").send({ name: "New name" }),
      request(app).delete(`/projects/${projectId}`).set("x-test-role", "none"),
      request(app).post(`/projects/${projectId}/members`).set("x-test-role", "none").send({ email: "person@example.com", role: "member" }),
      request(app).patch(`/projects/${projectId}/members/${targetUserId}`).set("x-test-role", "none").send({ role: "viewer" }),
      request(app).delete(`/projects/${projectId}/members/${targetUserId}`).set("x-test-role", "none"),
    ];

    const responses = await Promise.all(calls);
    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403]);
  });
});
