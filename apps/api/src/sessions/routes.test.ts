import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index";
import { ensureSchema, pool } from "../db";

const app = createApp();
const testEmail = `test-sessions-${Date.now()}@example.com`;
let token = "";
let sessionId = "";

beforeAll(async () => {
  await ensureSchema();
  const signup = await request(app).post("/auth/signup").send({
    email: testEmail,
    password: "supersecret123",
    displayName: "Session Host",
  });
  token = signup.body.token;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
  await pool.end();
});

const sessionPayload = {
  title: "Sunday Beach Volleyball",
  activityType: "volleyball",
  description: "Open play at the south courts.",
  scheduledAt: "2026-09-06T14:00:00.000Z",
  broadcastRadiusM: 150,
  checkinRadiusM: 40,
  shutoffRadiusM: 300,
};

describe("session lifecycle", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/sessions").send(sessionPayload);
    expect(res.status).toBe(401);
  });

  it("validates session radius constraints", async () => {
    const res = await request(app)
      .post("/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...sessionPayload, checkinRadiusM: 200, broadcastRadiusM: 100 });
    expect(res.status).toBe(400);
  });

  it("creates a scheduled session", async () => {
    const res = await request(app)
      .post("/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send(sessionPayload);
    expect(res.status).toBe(201);
    expect(res.body.session.title).toBe(sessionPayload.title);
    expect(res.body.session.status).toBe("scheduled");
    sessionId = res.body.session.id;
  });

  it("lists a host's sessions", async () => {
    const res = await request(app).get("/sessions/mine").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].id).toBe(sessionId);
  });

  it("starts and ends a hosted session", async () => {
    const started = await request(app)
      .post(`/sessions/${sessionId}/start`)
      .set("Authorization", `Bearer ${token}`);
    expect(started.status).toBe(200);
    expect(started.body.session.status).toBe("live");

    const ended = await request(app)
      .post(`/sessions/${sessionId}/end`)
      .set("Authorization", `Bearer ${token}`);
    expect(ended.status).toBe(200);
    expect(ended.body.session.status).toBe("ended");
  });
});