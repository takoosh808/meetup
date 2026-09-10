import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index";
import { ensureSchema, pool } from "../db";

const app = createApp();
const email = `test-push-${Date.now()}@example.com`;
const endpoint = "https://push.example.test/subscription/1";
let token = "";

beforeAll(async () => {
  await ensureSchema();
  const signup = await request(app).post("/auth/signup").send({
    email,
    password: "supersecret123",
    displayName: "Push User",
  });
  token = signup.body.token;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [email]);
  await pool.end();
});

describe("push subscriptions", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/notifications/subscription").send({});
    expect(res.status).toBe(401);
  });

  it("rejects malformed subscriptions", async () => {
    const res = await request(app)
      .post("/notifications/subscription")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint: "not-a-url", keys: {} });
    expect(res.status).toBe(400);
  });

  it("stores and removes a subscription", async () => {
    const subscription = {
      endpoint,
      keys: { p256dh: "public-key", auth: "auth-secret" },
    };
    const saved = await request(app)
      .post("/notifications/subscription")
      .set("Authorization", `Bearer ${token}`)
      .send(subscription);
    expect(saved.status).toBe(204);

    const removed = await request(app)
      .delete("/notifications/subscription")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint });
    expect(removed.status).toBe(204);
  });
});
