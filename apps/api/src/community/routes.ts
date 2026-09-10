import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware";
import {
  addGroupMember,
  createFriendRequest,
  createGroup,
  listFriendships,
  listGroupsForUser,
  isGroupOwner,
  updateFriendRequest,
} from "./repository";

const groupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
});

export const communityRouter = Router();
communityRouter.use(requireAuth);

communityRouter.get("/groups", async (req, res) => {
  res.json({ groups: await listGroupsForUser(req.userId!) });
});

communityRouter.post("/groups", async (req, res) => {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid group" });
  res.status(201).json({ group: await createGroup(req.userId!, parsed.data.name, parsed.data.description) });
});

communityRouter.post("/groups/:groupId/members", async (req, res) => {
  if (!(await isGroupOwner(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Only the group owner can add members" });
  }
  const userId = z.string().uuid().safeParse(req.body.userId);
  if (!userId.success) return res.status(400).json({ error: "Invalid user" });
  await addGroupMember(req.params.groupId, userId.data);
  res.status(204).send();
});

communityRouter.get("/friends", async (req, res) => {
  res.json({ friendships: await listFriendships(req.userId!) });
});

communityRouter.post("/friends/requests", async (req, res) => {
  const addresseeId = z.string().uuid().safeParse(req.body.userId);
  if (!addresseeId.success || addresseeId.data === req.userId) {
    return res.status(400).json({ error: "Invalid friend" });
  }
  res.status(201).json({ status: await createFriendRequest(req.userId!, addresseeId.data) });
});

communityRouter.post("/friends/requests/:requesterId/accept", async (req, res) => {
  const status = await updateFriendRequest(req.userId!, req.params.requesterId, "accepted");
  if (!status) return res.status(404).json({ error: "Friend request not found" });
  res.json({ status });
});

communityRouter.post("/friends/requests/:requesterId/reject", async (req, res) => {
  const status = await updateFriendRequest(req.userId!, req.params.requesterId, "rejected");
  if (!status) return res.status(404).json({ error: "Friend request not found" });
  res.json({ status });
});