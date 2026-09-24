import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index";
import { ensureSchema, pool } from "../db";

const app = createApp();
const adminEmail = `admin-test-${Date.now()}@example.com`;
const userEmail = `user-test-${Date.now()}@example.com`;
let adminToken = "";
let userToken = "";

beforeAll(async () => {
  await ensureSchema();
  const admin = await request(app).post("/auth/signup").send({ email: adminEmail, password: "supersecret123", displayName: "Admin" });
  const user = await request(app).post("/auth/signup").send({ email: userEmail, password: "supersecret123", displayName: "User" });
  adminToken = admin.body.token;
  userToken = user.body.token;
  await pool.query("UPDATE users SET is_admin = true WHERE email = $1", [adminEmail]);
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [adminEmail, userEmail]);
  await pool.end();
});

describe("admin routes", () => {
  it("rejects non-admin users", async () => {
    const response = await request(app).get("/admin/users").set("Authorization", `Bearer ${userToken}`);
    expect(response.status).toBe(403);
  });

  it("allows admins to view users, events, and groups", async () => {
    const headers = { Authorization: `Bearer ${adminToken}` };
    const users = await request(app).get("/admin/users").set(headers);
    const events = await request(app).get("/admin/events").set(headers);
    const groups = await request(app).get("/admin/groups").set(headers);
    expect(users.status).toBe(200);
    expect(events.status).toBe(200);
    expect(groups.status).toBe(200);
    expect(users.body.users.some((entry: { email: string }) => entry.email === adminEmail)).toBe(true);
  });

  it("allows admins to edit and remove users but not themselves", async () => {
    const headers = { Authorization: `Bearer ${adminToken}` };
    const listed = await request(app).get("/admin/users").set(headers);
    const target = listed.body.users.find((entry: { email: string }) => entry.email === userEmail);
    const updated = await request(app)
      .patch(`/admin/users/${target.id}`)
      .set(headers)
      .send({ email: userEmail, displayName: "Edited User", isAdmin: false });
    expect(updated.status).toBe(200);
    expect(updated.body.user.display_name).toBe("Edited User");

    const selfDelete = await request(app).delete(`/admin/users/${listed.body.users.find((entry: { email: string }) => entry.email === adminEmail).id}`).set(headers);
    expect(selfDelete.status).toBe(400);

    const removed = await request(app).delete(`/admin/users/${target.id}`).set(headers);
    expect(removed.status).toBe(204);
  });
});
