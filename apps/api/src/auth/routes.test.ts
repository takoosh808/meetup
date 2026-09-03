import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index";
import { ensureSchema, pool } from "../db";

const app = createApp();
const testEmail = `test-auth-${Date.now()}@example.com`;

beforeAll(async () => {
  await ensureSchema();
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
  await pool.end();
});

describe("auth flow", () => {
  it("rejects signup with invalid input", async () => {
    const res = await request(app).post("/auth/signup").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("signs up a new user", async () => {
    const res = await request(app).post("/auth/signup").send({
      email: testEmail,
      password: "supersecret123",
      displayName: "Test User",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate signup", async () => {
    const res = await request(app).post("/auth/signup").send({
      email: testEmail,
      password: "supersecret123",
      displayName: "Test User",
    });
    expect(res.status).toBe(409);
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app).post("/auth/login").send({
      email: testEmail,
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
  });

  it("logs in and fetches /me with the token", async () => {
    const loginRes = await request(app).post("/auth/login").send({
      email: testEmail,
      password: "supersecret123",
    });
    expect(loginRes.status).toBe(200);
    const { token } = loginRes.body;

    const meRes = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testEmail);
  });

  it("rejects /me without a token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});
