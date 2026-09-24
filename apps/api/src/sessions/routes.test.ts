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

  it("rejects location updates without an RSVP", async () => {
    const res = await request(app)
      .post("/sessions/not-a-session/location")
      .set("Authorization", `Bearer ${token}`)
      .send({ latitude: 34.0195, longitude: -118.4912, accuracyM: 5 });
    expect(res.status).toBe(403);
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
    expect(match.map_latitude).toBe(34.0195);
    expect(match.map_longitude).toBe(-118.4912);
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

    const checkedIn = await request(app)
      .post(`/sessions/${sessionId}/location`)
      .set("Authorization", `Bearer ${token}`)
      .send({ latitude: 34.0195, longitude: -118.4912, accuracyM: 5 });
    expect(checkedIn.status).toBe(200);
    expect(checkedIn.body.attendanceStatus).toBe("checked_in");

    const withCheckIn = await request(app)
      .get("/sessions/nearby?latitude=34.0195&longitude=-118.4912&radiusM=1000")
      .set("Authorization", `Bearer ${token}`);
    const checkedInMatch = withCheckIn.body.sessions.find(
      (session: { id: string }) => session.id === sessionId
    );
    expect(checkedInMatch.checked_in_count).toBe(1);
    expect(checkedInMatch.current_user_rsvp).toBe("checked_in");

    const firstOutsideUpdate = await request(app)
      .post(`/sessions/${sessionId}/location`)
      .set("Authorization", `Bearer ${token}`)
      .send({ latitude: 34.025, longitude: -118.4912, accuracyM: 0 });
    expect(firstOutsideUpdate.status).toBe(200);
    expect(firstOutsideUpdate.body.attendanceStatus).toBe("checked_in");

    await pool.query(
      `UPDATE session_attendance
       SET outside_radius_since = now() - INTERVAL '2 minutes'
       WHERE session_id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)`,
      [sessionId, testEmail]
    );

    const checkedOut = await request(app)
      .post(`/sessions/${sessionId}/location`)
      .set("Authorization", `Bearer ${token}`)
      .send({ latitude: 34.025, longitude: -118.4912, accuracyM: 0 });
    expect(checkedOut.status).toBe(200);
    expect(checkedOut.body.attendanceStatus).toBe("heading_there");

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

  it("updates the remaining time limit for a live hosted session", async () => {
    const create = await request(app)
      .post("/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...sessionPayload,
        title: `${sessionPayload.title} timer`,
        anchor: { latitude: 34.0195, longitude: -118.4912 },
      });
    const sessionId = create.body.session.id;
    await request(app).post(`/sessions/${sessionId}/start`).set("Authorization", `Bearer ${token}`);
    const updated = await request(app)
      .post(`/sessions/${sessionId}/time-limit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ remainingMinutes: 45 });
    expect(updated.status).toBe(200);
    expect(updated.body.session.duration_minutes).toBeGreaterThanOrEqual(45);
  });

  it("automatically ends hosting when the host leaves the shutoff radius", async () => {
    const create = await request(app)
      .post("/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...sessionPayload,
        title: `${sessionPayload.title} shutoff`,
        anchor: { latitude: 34.0195, longitude: -118.4912 },
      });
    const hostSessionId = create.body.session.id;

    await request(app)
      .post(`/sessions/${hostSessionId}/start`)
      .set("Authorization", `Bearer ${token}`);

    const nearby = await request(app)
      .post(`/sessions/${hostSessionId}/host-location`)
      .set("Authorization", `Bearer ${token}`)
      .send({ latitude: 34.03, longitude: -118.4912, accuracyM: 5 });
    expect(nearby.status).toBe(200);
    expect(nearby.body.status).toBe("ended");
  });

  it("rejects a group session for a non-member", async () => {
    const group = await request(app)
      .post("/community/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Private Group ${Date.now()}` });
    const otherEmail = `non-member-${Date.now()}@example.com`;
    const other = await request(app).post("/auth/signup").send({
      email: otherEmail,
      password: "supersecret123",
      displayName: "Non Member",
    });
    const rejected = await request(app)
      .post("/sessions")
      .set("Authorization", `Bearer ${other.body.token}`)
      .send({ ...sessionPayload, groupId: group.body.group.id, anchor: { latitude: 34.0195, longitude: -118.4912 } });
    expect(rejected.status).toBe(403);
    await pool.query("DELETE FROM users WHERE email = $1", [otherEmail]);
  });
});