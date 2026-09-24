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

describe("CORS", () => {
  it("allows the configured frontend origin", async () => {
    process.env.WEB_ORIGIN = "https://frontend.example/";
    const app = createApp();
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://frontend.example");
    expect(res.headers["access-control-allow-origin"]).toBe("https://frontend.example");
  });

  it("does not allow an unconfigured origin", async () => {
    process.env.WEB_ORIGIN = "https://frontend.example";
    const app = createApp();
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://other.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
