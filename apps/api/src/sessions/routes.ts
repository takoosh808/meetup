import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import {
  createSession,
  listNearbySessions,
  listSessionsByHost,
  transitionSession,
  toggleRsvp,
} from "./repository";
import { createSessionSchema, nearbySessionsSchema } from "./schemas";

export const sessionRouter = Router();

sessionRouter.use(requireAuth);

sessionRouter.post("/", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const session = await createSession({ hostId: req.userId!, ...parsed.data });
  res.status(201).json({ session });
});

sessionRouter.get("/mine", async (req, res) => {
  const sessions = await listSessionsByHost(req.userId!);
  res.json({ sessions });
});

sessionRouter.post("/:sessionId/start", async (req, res) => {
  const session = await transitionSession(req.params.sessionId, req.userId!, "live");
  if (!session) {
    return res.status(404).json({ error: "Session not found or already ended" });
  }
  res.json({ session });
});

sessionRouter.post("/:sessionId/end", async (req, res) => {
  const session = await transitionSession(req.params.sessionId, req.userId!, "ended");
  if (!session) {
    return res.status(404).json({ error: "Session not found or already ended" });
  }
  res.json({ session });
});

sessionRouter.get("/nearby", async (req, res) => {
  const parsed = nearbySessionsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid location query", details: parsed.error.flatten() });
  }
  const sessions = await listNearbySessions({ ...parsed.data, userId: req.userId! });
  res.json({ sessions });
});

sessionRouter.post("/:sessionId/rsvp", async (req, res) => {
  try {
    const rsvpStatus = await toggleRsvp(req.params.sessionId, req.userId!);
    res.json({ rsvpStatus });
  } catch {
    res.status(404).json({ error: "Session not found or ended" });
  }
});