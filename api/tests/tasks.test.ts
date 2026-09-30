import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const taskMocks = vi.hoisted(() => ({
  changeTaskStatus: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  getProjectSnapshot: vi.fn(),
  getTask: vi.fn(),
  updateTask: vi.fn(),
}));

const projectMocks = vi.hoisted(() => ({
  getMembership: vi.fn(),
}));

vi.mock("../src/services/tasks.js", () => taskMocks);
vi.mock("../src/services/projects.js", () => projectMocks);

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
const taskId = "20000000-0000-4000-8000-000000000001";
const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const task = {
  id: taskId,
  projectId,
  title: "Test requirement",
  description: null,
  status: "todo" as const,
  priority: "medium" as const,
  assigneeId: null,
  createdBy: actorId,
  completedBy: null,
  completedAt: null,
  position: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("task routes", () => {
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
    taskMocks.createTask.mockResolvedValue(task);
    taskMocks.getTask.mockResolvedValue(task);
  });

  it("allows a member to create a requirement", async () => {
    const response = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .set("x-test-role", "member")
      .send({ title: "Test requirement", priority: "medium", position: 0 });

    expect(response.status).toBe(201);
    expect(taskMocks.createTask).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({ title: "Test requirement" }),
      actorId,
    );
  });

  it("prevents a member from assigning a requirement to the project owner or admin", async () => {
    projectMocks.getMembership.mockResolvedValue({ role: "owner" });

    const response = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .set("x-test-role", "member")
      .send({
        title: "Unauthorized assignment",
        priority: "high",
        position: 0,
        assigneeId: "10000000-0000-4000-8000-000000000002",
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(response.body.error.message).toContain("Members cannot assign requirements to project owners");
    expect(taskMocks.createTask).not.toHaveBeenCalled();
  });

  it("allows an owner to assign a requirement to anyone", async () => {
    projectMocks.getMembership.mockResolvedValue({ role: "member" });

    const response = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .set("x-test-role", "owner")
      .send({
        title: "Owner task assignment",
        priority: "high",
        position: 0,
        assigneeId: "10000000-0000-4000-8000-000000000002",
      });

    expect(response.status).toBe(201);
    expect(taskMocks.createTask).toHaveBeenCalled();
  });

  it("rejects a viewer creating a requirement", async () => {
    const response = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .set("x-test-role", "viewer")
      .send({ title: "Not allowed", priority: "medium", position: 0 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(taskMocks.createTask).not.toHaveBeenCalled();
  });

  it("prevents non-assignee member from changing another user's task status", async () => {
    taskMocks.getTask.mockResolvedValue({
      ...task,
      createdBy: "other-user",
      assigneeId: "other-user",
    });

    const response = await request(app)
      .patch(`/projects/${projectId}/tasks/${taskId}/status`)
      .set("x-test-role", "member")
      .send({ status: "done", position: 1000 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(taskMocks.changeTaskStatus).not.toHaveBeenCalled();
  });

  it("allows assignee member or admin to change task status", async () => {
    taskMocks.getTask.mockResolvedValue({
      ...task,
      createdBy: "other-user",
      assigneeId: actorId,
    });
    taskMocks.changeTaskStatus.mockResolvedValue({ ...task, status: "done" });

    const memberResp = await request(app)
      .patch(`/projects/${projectId}/tasks/${taskId}/status`)
      .set("x-test-role", "member")
      .send({ status: "done", position: 1000 });

    expect(memberResp.status).toBe(200);

    const adminResp = await request(app)
      .patch(`/projects/${projectId}/tasks/${taskId}/status`)
      .set("x-test-role", "admin")
      .send({ status: "done", position: 1000 });

    expect(adminResp.status).toBe(200);
  });

  it("rejects non-members across snapshot and task routes", async () => {
    const responses = await Promise.all([
      request(app).get(`/projects/${projectId}/snapshot`).set("x-test-role", "none"),
      request(app).post(`/projects/${projectId}/tasks`).set("x-test-role", "none").send({ title: "No" }),
      request(app).patch(`/projects/${projectId}/tasks/${taskId}`).set("x-test-role", "none").send({ title: "No" }),
      request(app).patch(`/projects/${projectId}/tasks/${taskId}/status`).set("x-test-role", "none").send({ status: "done", position: 0 }),
      request(app).delete(`/projects/${projectId}/tasks/${taskId}`).set("x-test-role", "none"),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403]);
  });
});

