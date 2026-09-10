import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(394871)");
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
        scheduled_at TIMESTAMPTZ NOT NULL,
        broadcast_radius_m INTEGER NOT NULL,
        checkin_radius_m INTEGER NOT NULL,
        shutoff_radius_m INTEGER NOT NULL,
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS anchor_location geography(Point, 4326);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS sessions_anchor_location_gix
      ON sessions USING GIST (anchor_location);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_attendance (
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rsvp_status TEXT NOT NULL DEFAULT 'heading_there'
          CHECK (rsvp_status IN ('heading_there', 'checked_in', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (session_id, user_id)
      );
    `);
    await client.query(`
      ALTER TABLE session_attendance
      DROP CONSTRAINT IF EXISTS session_attendance_rsvp_status_check;
    `);
    await client.query(`
      ALTER TABLE session_attendance
      ADD CONSTRAINT session_attendance_rsvp_status_check
      CHECK (rsvp_status IN ('heading_there', 'checked_in', 'cancelled'));
    `);
  } finally {
    await client.query("SELECT pg_advisory_unlock(394871)");
    client.release();
  }
}
