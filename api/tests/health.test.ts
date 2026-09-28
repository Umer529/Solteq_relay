import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";

describe("GET /health", () => {
  let app: Express;

  beforeAll(async () => {
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.WEB_ORIGIN = "http://localhost:3000";
    const appModule = await import("../src/app.js");
    app = appModule.createApp();
  });

  it("reports the service as healthy", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "relay-api" });
  }, 15_000);
});
