import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import {
  createSession,
  getDirectionsAnchor,
  listNearbySessions,
  listSessionsByHost,
  isGroupMember,
  transitionSession,
  toggleRsvp,
  updateAttendanceFromLocation,
  updateHostLocation,
  updateLiveTimeLimit,
} from "./repository";
import { createSessionSchema, nearbySessionsSchema } from "./schemas";
import { notifySessionStarted } from "../notifications/service";

export const sessionRouter = Router();

sessionRouter.use(requireAuth);

sessionRouter.post("/", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  if (parsed.data.groupId && !(await isGroupMember(parsed.data.groupId, req.userId!))) {
    return res.status(403).json({ error: "Join the group before creating a group session" });
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
  void notifySessionStarted(session.id, session.title);
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
    const isHeadingThere = await toggleRsvp(req.params.sessionId, req.userId!);
    res.json({ isHeadingThere });
  } catch {
    res.status(404).json({ error: "Session not found or ended" });
  }
});

sessionRouter.get("/:sessionId/directions", async (req, res) => {
  const anchor = await getDirectionsAnchor(req.params.sessionId, req.userId!);
  if (!anchor) {
    return res.status(403).json({ error: "RSVP to this session before requesting directions" });
  }
  res.json({ anchor });
});

sessionRouter.post("/:sessionId/location", async (req, res) => {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  const accuracyM = Number(req.body.accuracyM ?? 0);
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > 500
  ) {
    return res.status(400).json({ error: "Invalid location" });
  }

  try {
    const attendance = await updateAttendanceFromLocation({
      sessionId: req.params.sessionId,
      userId: req.userId!,
      latitude,
      longitude,
      accuracyM,
    });
    res.json(attendance);
  } catch {
    res.status(403).json({ error: "RSVP to this active session before sending location" });
  }
});

sessionRouter.post("/:sessionId/host-location", async (req, res) => {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  const accuracyM = Number(req.body.accuracyM ?? 0);
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > 500
  ) {
    return res.status(400).json({ error: "Invalid location" });
  }

  try {
    const status = await updateHostLocation({
      sessionId: req.params.sessionId,
      hostId: req.userId!,
      latitude,
      longitude,
      accuracyM,
    });
    res.json({ status });
  } catch {
    res.status(403).json({ error: "Only the host of a live anchored session can send this location" });
  }
});

sessionRouter.post("/:sessionId/time-limit", async (req, res) => {
  const remainingMinutes = Number(req.body.remainingMinutes);
  if (!Number.isInteger(remainingMinutes) || remainingMinutes < 15 || remainingMinutes > 720) {
    return res.status(400).json({ error: "Time limit must be between 15 and 720 minutes" });
  }
  const session = await updateLiveTimeLimit(req.params.sessionId, req.userId!, remainingMinutes);
  if (!session) return res.status(404).json({ error: "Live session not found or not owned by you" });
  res.json({ session });
});