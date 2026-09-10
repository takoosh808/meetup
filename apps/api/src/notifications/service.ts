import webpush from "web-push";
import { listPushSubscriptionsForSession } from "./repository";

const subject = process.env.VAPID_SUBJECT;
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (subject && publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function getVapidPublicKey() {
  return publicKey ?? null;
}

export async function notifySessionStarted(sessionId: string, title: string) {
  if (!subject || !publicKey || !privateKey) return;
  const subscriptions = await listPushSubscriptionsForSession(sessionId);
  const payload = JSON.stringify({
    title: `${title} is live`,
    body: "Your session is happening now.",
    sessionId,
  });

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload);
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        return;
      }
      console.error("Failed to deliver push notification", error);
    }
  }));
}