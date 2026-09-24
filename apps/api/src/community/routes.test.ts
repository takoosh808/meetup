import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index";
import { ensureSchema, pool } from "../db";

const app = createApp();
const ownerEmail = `community-owner-${Date.now()}@example.com`;
const memberEmail = `community-member-${Date.now()}@example.com`;
let ownerToken = "";
let memberToken = "";
let memberId = "";
let groupId = "";

beforeAll(async () => {
  await ensureSchema();
  const owner = await request(app).post("/auth/signup").send({ email: ownerEmail, password: "supersecret123", displayName: "Owner" });
  const member = await request(app).post("/auth/signup").send({ email: memberEmail, password: "supersecret123", displayName: "Member" });
  ownerToken = owner.body.token;
  memberToken = member.body.token;
  memberId = member.body.user.id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [ownerEmail, memberEmail]);
  await pool.end();
});

describe("community graph", () => {
  it("creates a group and adds a member", async () => {
    const created = await request(app)
      .post("/community/groups")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Sunday Volleyball", description: "Weekly open play" });
    expect(created.status).toBe(201);
    groupId = created.body.group.id;

    const added = await request(app)
      .post(`/community/groups/${created.body.group.id}/members`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: memberId });
    expect(added.status).toBe(204);

    const groups = await request(app).get("/community/groups").set("Authorization", `Bearer ${memberToken}`);
    const joinedGroup = groups.body.groups.find((group: { name: string }) => group.name === "Sunday Volleyball");
    expect(joinedGroup).toBeDefined();
    expect(joinedGroup.member_count).toBe(2);

    const denied = await request(app)
      .post(`/community/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ userId: memberId });
    expect(denied.status).toBe(204);
  });

  it("sends and accepts a friend request", async () => {
    const sent = await request(app)
      .post("/community/friends/requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: memberId });
    expect(sent.status).toBe(201);
    expect(sent.body.status).toBe("pending");

    const incoming = await request(app)
      .get("/community/friends")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(incoming.body.friendships[0].incoming).toBe(true);

    const accepted = await request(app)
      .post(`/community/friends/requests/${(await request(app).get("/auth/me").set("Authorization", `Bearer ${ownerToken}`)).body.user.id}/accept`)
      .set("Authorization", `Bearer ${memberToken}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe("accepted");
  });
});
