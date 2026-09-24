import { pool } from "../db";

export async function listUsers() {
  const result = await pool.query(`
    SELECT id, email, display_name, is_admin, created_at
    FROM users ORDER BY created_at DESC LIMIT 500
  `);
  return result.rows;
}

export async function listEvents() {
  const result = await pool.query(`
    SELECT sessions.id, sessions.title, sessions.activity_type, sessions.status,
      sessions.scheduled_at, users.display_name AS host_name,
      COUNT(attendance.user_id)::integer AS attendee_count
    FROM sessions
    JOIN users ON users.id = sessions.host_id
    LEFT JOIN session_attendance attendance
      ON attendance.session_id = sessions.id
      AND attendance.rsvp_status IN ('heading_there', 'checked_in')
    GROUP BY sessions.id, users.display_name
    ORDER BY sessions.created_at DESC LIMIT 500
  `);
  return result.rows;
}

export async function listGroups() {
  const result = await pool.query(`
    SELECT groups.id, groups.name, groups.description,
      users.display_name AS owner_name,
      COUNT(group_members.user_id)::integer AS member_count
    FROM groups
    JOIN users ON users.id = groups.owner_id
    LEFT JOIN group_members ON group_members.group_id = groups.id
    GROUP BY groups.id, users.display_name
    ORDER BY groups.created_at DESC LIMIT 500
  `);
  return result.rows;
}

export async function endEvent(eventId: string) {
  const result = await pool.query(
    `UPDATE sessions SET status = 'ended', ended_at = now()
     WHERE id = $1 AND status <> 'ended' RETURNING id`,
    [eventId]
  );
  return result.rowCount === 1;
}
