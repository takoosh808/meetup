import { Router } from "express";
import { requireAdmin, requireAuth } from "../auth/middleware";
import { endEvent, listEvents, listGroups, listUsers } from "./repository";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", async (_req, res) => {
  res.json({ users: await listUsers() });
});

adminRouter.get("/events", async (_req, res) => {
  res.json({ events: await listEvents() });
});

adminRouter.get("/groups", async (_req, res) => {
  res.json({ groups: await listGroups() });
});

adminRouter.post("/events/:eventId/end", async (req, res) => {
  const ended = await endEvent(req.params.eventId);
  if (!ended) return res.status(404).json({ error: "Event not found or already ended" });
  res.status(204).send();
});
