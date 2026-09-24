import { pool } from "../db";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  displayName: string;
}): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
    RETURNING id, email, password_hash, display_name, avatar_url, is_admin, created_at`,
    [params.email, params.passwordHash, params.displayName]
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, email, password_hash, display_name, avatar_url, is_admin, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, email, password_hash, display_name, avatar_url, is_admin, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateUserPassword(id: string, passwordHash: string) {
  await pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, passwordHash]);
}
