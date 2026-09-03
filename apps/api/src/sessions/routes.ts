import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { createSession, listSessionsByHost, transitionSession } from "./repository";
import { createSessionSchema } from "./schemas";

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