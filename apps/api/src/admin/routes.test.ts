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
});
