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
}

const sessionColumns = `
  id, host_id, title, activity_type, description, status, scheduled_at,
  broadcast_radius_m, checkin_radius_m, shutoff_radius_m, started_at, ended_at, created_at
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
}): Promise<SessionRecord[]> {
  const result = await pool.query<SessionRecord>(
    `SELECT ${sessionColumns},
       ROUND(ST_Y(anchor_location::geometry)::numeric, 3)::double precision AS map_latitude,
       ROUND(ST_X(anchor_location::geometry)::numeric, 3)::double precision AS map_longitude
     FROM sessions
     WHERE status IN ('scheduled', 'live')
       AND anchor_location IS NOT NULL
       AND ST_DWithin(
         anchor_location,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         $3
       )
     ORDER BY scheduled_at ASC
     LIMIT 100`,
    [params.latitude, params.longitude, params.radiusM]
  );
  return result.rows;
}