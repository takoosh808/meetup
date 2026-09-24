import { pool } from "../db";

export async function listUsers() {
  const result = await pool.query(`
    SELECT id, email, display_name, is_admin, created_at
    FROM users ORDER BY created_at DESC LIMIT 500
  `);
  return result.rows;
}

export async function updateUser(userId: string, params: { email: string; displayName: string; isAdmin: boolean }) {
  const result = await pool.query(
    `UPDATE users SET email = $2, display_name = $3, is_admin = $4
     WHERE id = $1
     RETURNING id, email, display_name, is_admin, created_at`,
    [userId, params.email, params.displayName, params.isAdmin]
  );
  return result.rows[0] ?? null;
}

export async function deleteUser(userId: string, adminId: string) {
  if (userId === adminId) return false;
  const result = await pool.query("DELETE FROM users WHERE id = $1 AND id <> $2", [userId, adminId]);
  return result.rowCount === 1;
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

export async function deletePreviousEvent(eventId: string) {
  const result = await pool.query(
    "DELETE FROM sessions WHERE id = $1 AND status = 'ended' RETURNING id",
    [eventId]
  );
  return result.rowCount === 1;
}

export async function deleteGroup(groupId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE sessions SET group_id = NULL WHERE group_id = $1", [groupId]);
    const result = await client.query("DELETE FROM groups WHERE id = $1 RETURNING id", [groupId]);
    await client.query("COMMIT");
    return result.rowCount === 1;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
