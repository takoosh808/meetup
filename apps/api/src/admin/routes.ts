import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../auth/middleware";
import { deleteGroup, deletePreviousEvent, deleteUser, endEvent, listEvents, listGroups, listUsers, updateUser } from "./repository";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", async (_req, res) => {
  res.json({ users: await listUsers() });
});

adminRouter.get("/events", async (_req, res) => {
  res.json({ events: await listEvents() });
});

const userUpdateSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(1).max(60),
  isAdmin: z.boolean(),
});

adminRouter.patch("/users/:userId", async (req, res) => {
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid user update" });
  try {
    const user = await updateUser(req.params.userId, parsed.data);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ error: "Email is already in use" });
    }
    throw error;
  }
});

adminRouter.delete("/users/:userId", async (req, res) => {
  const deleted = await deleteUser(req.params.userId, req.userId!);
  if (!deleted) return res.status(400).json({ error: "You cannot remove your own admin account" });
  res.status(204).send();
});

adminRouter.get("/groups", async (_req, res) => {
  res.json({ groups: await listGroups() });
});

adminRouter.post("/events/:eventId/end", async (req, res) => {
  const ended = await endEvent(req.params.eventId);
  if (!ended) return res.status(404).json({ error: "Event not found or already ended" });
  res.status(204).send();
});

adminRouter.delete("/events/:eventId", async (req, res) => {
  const deleted = await deletePreviousEvent(req.params.eventId);
  if (!deleted) return res.status(400).json({ error: "Only ended events can be removed" });
  res.status(204).send();
});

adminRouter.delete("/groups/:groupId", async (req, res) => {
  const deleted = await deleteGroup(req.params.groupId);
  if (!deleted) return res.status(404).json({ error: "Group not found" });
  res.status(204).send();
});
