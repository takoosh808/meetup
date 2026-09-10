import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware";
import { deletePushSubscription, upsertPushSubscription } from "./repository";
import { getVapidPublicKey } from "./service";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

notificationRouter.get("/config", (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

notificationRouter.post("/subscription", async (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid push subscription" });
  await upsertPushSubscription(req.userId!, {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  res.status(204).send();
});

notificationRouter.delete("/subscription", async (req, res) => {
  const endpoint = z.string().url().safeParse(req.body?.endpoint);
  if (!endpoint.success) return res.status(400).json({ error: "Invalid push subscription endpoint" });
  await deletePushSubscription(req.userId!, endpoint.data);
  res.status(204).send();
});