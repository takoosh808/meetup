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
  current_user_rsvp?: "heading_there" | "checked_in" | "cancelled" | null;
  has_anchor?: boolean;
  checked_in_count?: number;
}

const sessionColumns = `
  id, host_id, title, activity_type, description, status, scheduled_at, duration_minutes,
  broadcast_radius_m, checkin_radius_m, shutoff_radius_m, started_at, ended_at, created_at,
  anchor_location IS NOT NULL AS has_anchor
`;

const nearbySessionColumns = `
  sessions.id, sessions.host_id, sessions.title, sessions.activity_type,
  sessions.description, sessions.status, sessions.scheduled_at, sessions.duration_minutes,
  sessions.broadcast_radius_m, sessions.checkin_radius_m, sessions.shutoff_radius_m,
  sessions.started_at, sessions.ended_at, sessions.created_at,
  sessions.anchor_location IS NOT NULL AS has_anchor
`;

const hostSessionColumns = `
  sessions.id, sessions.host_id, sessions.title, sessions.activity_type,
  sessions.description, sessions.status, sessions.scheduled_at, sessions.duration_minutes,
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
  durationMinutes: number;
  anchor?: { latitude: number; longitude: number };
  groupId?: string;
}): Promise<SessionRecord> {
  const result = await pool.query<SessionRecord>(
    `INSERT INTO sessions (
       host_id, title, activity_type, description, scheduled_at,
       broadcast_radius_m, checkin_radius_m, shutoff_radius_m, anchor_location, group_id, duration_minutes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
       CASE WHEN $9::double precision IS NULL OR $10::double precision IS NULL
         THEN NULL
         ELSE ST_SetSRID(ST_MakePoint($10, $9), 4326)::geography
      END, $11, $12)
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
      params.groupId ?? null,
      params.durationMinutes,
    ]
  );
  return result.rows[0];
}

export async function listSessionsByHost(hostId: string): Promise<SessionRecord[]> {
  const result = await pool.query<SessionRecord>(
    `SELECT ${hostSessionColumns},
       COUNT(attendance.user_id) FILTER (WHERE attendance.rsvp_status = 'checked_in')::integer AS checked_in_count,
       COUNT(attendance.user_id) FILTER (WHERE attendance.rsvp_status = 'heading_there')::integer AS heading_there_count
     FROM sessions
     LEFT JOIN session_attendance attendance ON attendance.session_id = sessions.id
     WHERE sessions.host_id = $1
     GROUP BY sessions.id
    ORDER BY sessions.scheduled_at ASC`,
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
      ROUND(ST_Y(sessions.anchor_location::geometry)::numeric, 4)::double precision AS map_latitude,
      ROUND(ST_X(sessions.anchor_location::geometry)::numeric, 4)::double precision AS map_longitude,
       COUNT(attendance.user_id) FILTER (WHERE attendance.rsvp_status IN ('heading_there', 'checked_in'))::integer
         AS heading_there_count,
       COUNT(attendance.user_id) FILTER (WHERE attendance.rsvp_status = 'checked_in')::integer
         AS checked_in_count,
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
         WHEN session_attendance.rsvp_status IN ('heading_there', 'checked_in') THEN 'cancelled'
         ELSE 'heading_there'
       END,
       outside_radius_since = NULL,
       updated_at = now()
     RETURNING rsvp_status`,
    [sessionId, userId]
  );
  if (!result.rows[0]) {
    throw new Error("Session not found or ended");
  }
  return result.rows[0].rsvp_status;
}

export async function getDirectionsAnchor(sessionId: string, userId: string): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const result = await pool.query<{ latitude: number; longitude: number }>(
    `SELECT
       ST_Y(sessions.anchor_location::geometry)::double precision AS latitude,
       ST_X(sessions.anchor_location::geometry)::double precision AS longitude
     FROM sessions
     LEFT JOIN session_attendance attendance
       ON attendance.session_id = sessions.id AND attendance.user_id = $2
     WHERE sessions.id = $1
       AND sessions.status IN ('scheduled', 'live')
       AND sessions.anchor_location IS NOT NULL
       AND (sessions.host_id = $2 OR attendance.rsvp_status = 'heading_there')`,
    [sessionId, userId]
  );
  return result.rows[0] ?? null;
}

export async function updateAttendanceFromLocation(params: {
  sessionId: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
}): Promise<{
  attendanceStatus: "heading_there" | "checked_in";
  distanceM: number;
  checkinRadiusM: number;
}> {
  const result = await pool.query<{
    rsvp_status: "heading_there" | "checked_in";
    distance_m: number;
    checkin_radius_m: number;
  }>(
    `UPDATE session_attendance attendance
     SET rsvp_status = CASE
       WHEN ST_DWithin(
         sessions.anchor_location,
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
         sessions.checkin_radius_m + LEAST(GREATEST($5, 0), 100)
       ) THEN 'checked_in'
       WHEN attendance.rsvp_status = 'checked_in'
         AND NOT ST_DWithin(
           sessions.anchor_location,
           ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
           sessions.checkin_radius_m + 20
         )
         AND attendance.outside_radius_since <= now() - INTERVAL '2 minutes' THEN 'heading_there'
       ELSE attendance.rsvp_status
     END,
     outside_radius_since = CASE
       WHEN ST_DWithin(
         sessions.anchor_location,
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
         sessions.checkin_radius_m + LEAST(GREATEST($5, 0), 100)
       ) THEN NULL
       WHEN attendance.rsvp_status = 'checked_in'
         AND NOT ST_DWithin(
           sessions.anchor_location,
           ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
           sessions.checkin_radius_m + 20
         )
         AND attendance.outside_radius_since IS NOT NULL
         AND attendance.outside_radius_since <= now() - INTERVAL '2 minutes' THEN NULL
       WHEN attendance.rsvp_status = 'checked_in'
         AND NOT ST_DWithin(
           sessions.anchor_location,
           ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
           sessions.checkin_radius_m + 20
         ) THEN COALESCE(attendance.outside_radius_since, now())
       ELSE NULL
     END,
     updated_at = now()
     FROM sessions
     WHERE attendance.session_id = sessions.id
       AND attendance.session_id = $1
       AND attendance.user_id = $2
       AND attendance.rsvp_status IN ('heading_there', 'checked_in')
       AND sessions.status IN ('scheduled', 'live')
       AND sessions.anchor_location IS NOT NULL
     RETURNING attendance.rsvp_status,
       ST_Distance(
         sessions.anchor_location,
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography
       )::double precision AS distance_m,
       sessions.checkin_radius_m`,
    [params.sessionId, params.userId, params.latitude, params.longitude, params.accuracyM]
  );
  if (!result.rows[0]) {
    throw new Error("RSVP to this active session before sending location");
  }
  return {
    attendanceStatus: result.rows[0].rsvp_status,
    distanceM: result.rows[0].distance_m,
    checkinRadiusM: result.rows[0].checkin_radius_m,
  };
}

export async function updateHostLocation(params: {
  sessionId: string;
  hostId: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
}): Promise<"live" | "ended"> {
  const result = await pool.query<{ status: "live" | "ended" }>(
    `UPDATE sessions
     SET status = CASE
       WHEN NOT ST_DWithin(
         sessions.anchor_location,
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
         sessions.shutoff_radius_m + LEAST(GREATEST($5, 0), 100)
       ) THEN 'ended'
       ELSE 'live'
     END,
     ended_at = CASE
       WHEN NOT ST_DWithin(
         sessions.anchor_location,
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
         sessions.shutoff_radius_m + LEAST(GREATEST($5, 0), 100)
       ) THEN now()
       ELSE ended_at
     END
     WHERE sessions.id = $1
       AND sessions.host_id = $2
       AND sessions.status = 'live'
       AND sessions.anchor_location IS NOT NULL
     RETURNING status`,
    [params.sessionId, params.hostId, params.latitude, params.longitude, params.accuracyM]
  );
  if (!result.rows[0]) {
    throw new Error("Live anchored session not found");
  }
  return result.rows[0].status;
}

export async function isGroupMember(groupId: string, userId: string) {
  const result = await pool.query(
    "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
    [groupId, userId]
  );
  return result.rowCount === 1;
}

export async function updateLiveTimeLimit(sessionId: string, hostId: string, remainingMinutes: number) {
  const result = await pool.query<SessionRecord>(
    `UPDATE sessions
     SET duration_minutes = GREATEST(
       0,
       CEIL(EXTRACT(EPOCH FROM (now() - scheduled_at)) / 60)::integer + $3
     )
     WHERE id = $1 AND host_id = $2 AND status = 'live'
     RETURNING ${sessionColumns}`,
    [sessionId, hostId, remainingMinutes]
  );
  return result.rows[0] ?? null;
}