import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./index";

describe("GET /health", () => {
  it("returns status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /readyz", () => {
  it("reports database readiness", async () => {
    const app = createApp();
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
  });
});
