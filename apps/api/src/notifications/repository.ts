import { pool } from "../db";

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function upsertPushSubscription(userId: string, subscription: PushSubscriptionRecord) {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       updated_at = now()`,
    [userId, subscription.endpoint, subscription.p256dh, subscription.auth]
  );
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await pool.query("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2", [userId, endpoint]);
}

export async function listPushSubscriptionsForSession(sessionId: string): Promise<PushSubscriptionRecord[]> {
  const result = await pool.query<PushSubscriptionRecord>(
    `SELECT DISTINCT push.endpoint, push.p256dh, push.auth
     FROM push_subscriptions push
     WHERE push.user_id IN (
       SELECT attendance.user_id
       FROM session_attendance attendance
       WHERE attendance.session_id = $1
         AND attendance.rsvp_status IN ('heading_there', 'checked_in')
       UNION
       SELECT members.user_id
       FROM sessions
       JOIN group_members members ON members.group_id = sessions.group_id
       WHERE sessions.id = $1
     )`,
    [sessionId]
  );
  return result.rows;
}