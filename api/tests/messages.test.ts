import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const messageMocks = vi.hoisted(() => ({
  getMessages: vi.fn(),
  postMessage: vi.fn(),
}));

vi.mock("../src/services/messages.js", () => messageMocks);

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
const message = {
  id: "30000000-0000-4000-8000-000000000001",
  projectId,
  userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  body: "A useful update",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("message routes", () => {
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
    messageMocks.postMessage.mockResolvedValue(message);
    messageMocks.getMessages.mockResolvedValue([message]);
  });

  it("allows a member to post a message", async () => {
    const response = await request(app)
      .post(`/projects/${projectId}/messages`)
      .set("x-test-role", "member")
      .send({ body: "A useful update" });

    expect(response.status).toBe(201);
    expect(messageMocks.postMessage).toHaveBeenCalledWith(
      projectId,
      "A useful update",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("keeps viewer chat read-only", async () => {
    const response = await request(app)
      .post(`/projects/${projectId}/messages`)
      .set("x-test-role", "viewer")
      .send({ body: "Not allowed" });

    expect(response.status).toBe(403);
    expect(messageMocks.postMessage).not.toHaveBeenCalled();
  });

  it("paginates history for a project member", async () => {
    const before = "2026-01-02T00:00:00.000Z";
    const response = await request(app)
      .get(`/projects/${projectId}/messages`)
      .query({ before, limit: 25 })
      .set("x-test-role", "viewer");

    expect(response.status).toBe(200);
    expect(messageMocks.getMessages).toHaveBeenCalledWith(projectId, before, 25);
  });

  it("rejects a non-member from chat history and posting", async () => {
    const [history, posting] = await Promise.all([
      request(app).get(`/projects/${projectId}/messages`).set("x-test-role", "none"),
      request(app)
        .post(`/projects/${projectId}/messages`)
        .set("x-test-role", "none")
        .send({ body: "Not visible" }),
    ]);

    expect(history.status).toBe(403);
    expect(posting.status).toBe(403);
    expect(messageMocks.getMessages).not.toHaveBeenCalled();
    expect(messageMocks.postMessage).not.toHaveBeenCalled();
  });
});
