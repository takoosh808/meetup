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
  title: `Sunday Beach Volleyball ${Date.now()}`,
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
      .send({
        ...sessionPayload,
        anchor: { latitude: 34.0195, longitude: -118.4912 },
      });
    expect(res.status).toBe(201);
    expect(res.body.session.title).toBe(sessionPayload.title);
    expect(res.body.session.status).toBe("scheduled");
    sessionId = res.body.session.id;
  });

  it("returns anchored sessions near a requested location", async () => {
    const res = await request(app)
      .get("/sessions/nearby?latitude=34.0195&longitude=-118.4912&radiusM=1000")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const match = res.body.sessions.find((session: { id: string }) => session.id === sessionId);
    expect(match).toBeDefined();
    expect(match.title).toBe(sessionPayload.title);
    expect(match.map_latitude).toBe(34.02);
    expect(match.map_longitude).toBe(-118.491);
    expect(match.heading_there_count).toBe(0);
    expect(match.current_user_rsvp).toBeNull();
  });

  it("toggles an RSVP and includes the aggregate count", async () => {
    const deniedDirections = await request(app)
      .get(`/sessions/${sessionId}/directions`)
      .set("Authorization", `Bearer ${token}`);
    expect(deniedDirections.status).toBe(200);
    expect(deniedDirections.body.anchor).toEqual({ latitude: 34.0195, longitude: -118.4912 });

    const rsvp = await request(app)
      .post(`/sessions/${sessionId}/rsvp`)
      .set("Authorization", `Bearer ${token}`);
    expect(rsvp.status).toBe(200);
    expect(rsvp.body.rsvpStatus).toBe("heading_there");

    const directions = await request(app)
      .get(`/sessions/${sessionId}/directions`)
      .set("Authorization", `Bearer ${token}`);
    expect(directions.status).toBe(200);
    expect(directions.body.anchor).toEqual({ latitude: 34.0195, longitude: -118.4912 });

    const nearby = await request(app)
      .get("/sessions/nearby?latitude=34.0195&longitude=-118.4912&radiusM=1000")
      .set("Authorization", `Bearer ${token}`);
    const match = nearby.body.sessions.find((session: { id: string }) => session.id === sessionId);
    expect(match.heading_there_count).toBe(1);
    expect(match.current_user_rsvp).toBe("heading_there");

    const cancelled = await request(app)
      .post(`/sessions/${sessionId}/rsvp`)
      .set("Authorization", `Bearer ${token}`);
    expect(cancelled.body.rsvpStatus).toBe("cancelled");
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