import { pool } from "../db";

export type SessionStatus = "scheduled" | "live" | "ended";

export interface SessionRecord {
  id: string;
  host_id: string;
  title: string;
  activity_type: string;
  description: string | null;
  status: SessionStatus;
  scheduled_at: string;
  broadcast_radius_m: number;
  checkin_radius_m: number;
  shutoff_radius_m: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  map_latitude?: number;
  map_longitude?: number;
  heading_there_count?: number;
  current_user_rsvp?: "heading_there" | "cancelled" | null;
}

const sessionColumns = `
  id, host_id, title, activity_type, description, status, scheduled_at,
  broadcast_radius_m, checkin_radius_m, shutoff_radius_m, started_at, ended_at, created_at
`;

const nearbySessionColumns = `
  sessions.id, sessions.host_id, sessions.title, sessions.activity_type,
  sessions.description, sessions.status, sessions.scheduled_at,
  sessions.broadcast_radius_m, sessions.checkin_radius_m, sessions.shutoff_radius_m,
  sessions.started_at, sessions.ended_at, sessions.created_at
`;

export async function createSession(params: {
  hostId: string;
  title: string;
  activityType: string;
  description?: string;
  scheduledAt: string;
  broadcastRadiusM: number;
  checkinRadiusM: number;
  shutoffRadiusM: number;
  anchor?: { latitude: number; longitude: number };
}): Promise<SessionRecord> {
  const result = await pool.query<SessionRecord>(
    `INSERT INTO sessions (
       host_id, title, activity_type, description, scheduled_at,
       broadcast_radius_m, checkin_radius_m, shutoff_radius_m, anchor_location
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
       CASE WHEN $9::double precision IS NULL OR $10::double precision IS NULL
         THEN NULL
         ELSE ST_SetSRID(ST_MakePoint($10, $9), 4326)::geography
       END)
     RETURNING ${sessionColumns}`,
    [
      params.hostId,
      params.title,
      params.activityType,
      params.description ?? null,
      params.scheduledAt,
      params.broadcastRadiusM,
      params.checkinRadiusM,
      params.shutoffRadiusM,
      params.anchor?.latitude ?? null,
      params.anchor?.longitude ?? null,
    ]
  );
  return result.rows[0];
}

export async function listSessionsByHost(hostId: string): Promise<SessionRecord[]> {
  const result = await pool.query<SessionRecord>(
    `SELECT ${sessionColumns} FROM sessions WHERE host_id = $1 ORDER BY scheduled_at ASC`,
    [hostId]
  );
  return result.rows;
}

export async function transitionSession(
  sessionId: string,
  hostId: string,
  status: "live" | "ended"
): Promise<SessionRecord | null> {
  const timestampColumn = status === "live" ? "started_at" : "ended_at";
  const result = await pool.query<SessionRecord>(
    `UPDATE sessions
     SET status = $3, ${timestampColumn} = now()
     WHERE id = $1 AND host_id = $2 AND status <> 'ended'
     RETURNING ${sessionColumns}`,
    [sessionId, hostId, status]
  );
  return result.rows[0] ?? null;
}

export async function listNearbySessions(params: {
  latitude: number;
  longitude: number;
  radiusM: number;
  userId: string;
}): Promise<SessionRecord[]> {
  const result = await pool.query<SessionRecord>(
     `SELECT ${nearbySessionColumns},
       ROUND(ST_Y(sessions.anchor_location::geometry)::numeric, 3)::double precision AS map_latitude,
       ROUND(ST_X(sessions.anchor_location::geometry)::numeric, 3)::double precision AS map_longitude,
       COUNT(attendance.user_id) FILTER (WHERE attendance.rsvp_status = 'heading_there')::integer
         AS heading_there_count,
       MAX(CASE WHEN attendance.user_id = $4 THEN attendance.rsvp_status END) AS current_user_rsvp
     FROM sessions
     LEFT JOIN session_attendance attendance ON attendance.session_id = sessions.id
     WHERE status IN ('scheduled', 'live')
       AND sessions.anchor_location IS NOT NULL
       AND ST_DWithin(
         sessions.anchor_location,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         $3
       )
     GROUP BY sessions.id
    ORDER BY sessions.scheduled_at ASC
     LIMIT 100`,
    [params.latitude, params.longitude, params.radiusM, params.userId]
  );
  return result.rows;
}

export async function toggleRsvp(sessionId: string, userId: string): Promise<"heading_there" | "cancelled"> {
  const result = await pool.query<{ rsvp_status: "heading_there" | "cancelled" }>(
    `INSERT INTO session_attendance (session_id, user_id, rsvp_status)
     SELECT $1, $2, 'heading_there'
     WHERE EXISTS (
       SELECT 1 FROM sessions WHERE id = $1 AND status IN ('scheduled', 'live')
     )
     ON CONFLICT (session_id, user_id)
     DO UPDATE SET
       rsvp_status = CASE
         WHEN session_attendance.rsvp_status = 'heading_there' THEN 'cancelled'
         ELSE 'heading_there'
       END,
       updated_at = now()
     RETURNING rsvp_status`,
    [sessionId, userId]
  );
  if (!result.rows[0]) {
    throw new Error("Session not found or ended");
  }
  return result.rows[0].rsvp_status;
}