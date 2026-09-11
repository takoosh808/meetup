import { pool } from "../db";

export interface GroupRecord {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "member";
  member_count: number;
  owner_name: string;
  is_member: boolean;
  priority_updates: boolean;
}

export async function createGroup(ownerId: string, name: string, description?: string) {
  const result = await pool.query<GroupRecord>(
    `WITH new_group AS (
       INSERT INTO groups (owner_id, name, description) VALUES ($1, $2, $3)
       RETURNING id, name, description
     ), membership AS (
       INSERT INTO group_members (group_id, user_id, role)
       SELECT id, $1, 'owner' FROM new_group
     )
     SELECT id, name, description, 'owner'::text AS role, 1::integer AS member_count FROM new_group`,
    [ownerId, name, description ?? null]
  );
  return result.rows[0];
}

export async function listGroupsForUser(userId: string) {
  const result = await pool.query<GroupRecord>(
    `SELECT groups.id, groups.name, groups.description,
       owner.display_name AS owner_name,
       COALESCE(membership.role, 'member') AS role,
       COUNT(all_members.user_id)::integer AS member_count,
       membership.user_id IS NOT NULL AS is_member,
       COALESCE(membership.priority_updates, false) AS priority_updates
     FROM groups
     JOIN users owner ON owner.id = groups.owner_id
     LEFT JOIN group_members membership
       ON membership.group_id = groups.id AND membership.user_id = $1
     LEFT JOIN group_members all_members ON all_members.group_id = groups.id
     GROUP BY groups.id, groups.name, groups.description, owner.display_name,
       membership.role, membership.user_id, membership.priority_updates
     ORDER BY groups.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function addGroupMember(groupId: string, userId: string) {
  await pool.query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, userId]
  );
}

export async function setGroupPriority(groupId: string, userId: string, priority: boolean) {
  await pool.query(
    "UPDATE group_members SET priority_updates = $3 WHERE group_id = $1 AND user_id = $2",
    [groupId, userId, priority]
  );
}

export async function createFriendRequest(requesterId: string, addresseeId: string) {
  const result = await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id)
     VALUES ($1, $2)
     ON CONFLICT (requester_id, addressee_id)
     DO UPDATE SET status = 'pending', updated_at = now()
     RETURNING status`,
    [requesterId, addresseeId]
  );
  return result.rows[0].status as string;
}

export async function listFriendships(userId: string) {
  const result = await pool.query(
    `SELECT friendships.requester_id, friendships.addressee_id, friendships.status,
       requester.display_name AS requester_name, addressee.display_name AS addressee_name,
       friendships.requester_id = $1 AS incoming, friendships.priority_updates
     FROM friendships
     JOIN users requester ON requester.id = friendships.requester_id
     JOIN users addressee ON addressee.id = friendships.addressee_id
     WHERE requester_id = $1 OR addressee_id = $1
     ORDER BY friendships.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function setFriendPriority(userId: string, friendId: string, priority: boolean) {
  await pool.query(
    `UPDATE friendships SET priority_updates = $3
     WHERE status = 'accepted' AND ((requester_id = $1 AND addressee_id = $2)
       OR (requester_id = $2 AND addressee_id = $1))`,
    [userId, friendId, priority]
  );
}

export async function updateFriendRequest(userId: string, requesterId: string, status: "accepted" | "rejected") {
  const result = await pool.query(
    `UPDATE friendships SET status = $3, updated_at = now()
     WHERE requester_id = $1 AND addressee_id = $2
     RETURNING status`,
    [requesterId, userId, status]
  );
  return result.rows[0]?.status as string | undefined;
}

export async function isGroupOwner(groupId: string, userId: string) {
  const result = await pool.query("SELECT 1 FROM groups WHERE id = $1 AND owner_id = $2", [groupId, userId]);
  return result.rowCount === 1;
}