export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export type ActivityType = "volleyball" | "basketball" | "soccer" | "running" | "other";
export type SessionStatus = "scheduled" | "live" | "ended";

export interface Session {
  id: string;
  title: string;
  activity_type: ActivityType;
  description: string | null;
  status: SessionStatus;
  scheduled_at: string;
  broadcast_radius_m: number;
  checkin_radius_m: number;
  shutoff_radius_m: number;
  started_at: string | null;
  ended_at: string | null;
  map_latitude?: number;
  map_longitude?: number;
  heading_there_count?: number;
  current_user_rsvp?: "heading_there" | "checked_in" | "cancelled" | null;
}

export interface CreateSessionInput {
  title: string;
  activityType: ActivityType;
  description?: string;
  scheduledAt: string;
  broadcastRadiusM: number;
  checkinRadiusM: number;
  shutoffRadiusM: number;
  anchor?: { latitude: number; longitude: number };
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function parseJsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  return body;
}

export async function signup(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow(res);
}

export async function login(params: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow(res);
}

export async function fetchMe(token: string): Promise<{ user: PublicUser }> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(res);
}

export async function fetchMySessions(token: string): Promise<{ sessions: Session[] }> {
  const res = await fetch(`${API_URL}/sessions/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(res);
}

export async function fetchNearbySessions(
  token: string,
  params: { latitude: number; longitude: number; radiusM?: number }
): Promise<{ sessions: Session[] }> {
  const query = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    radiusM: String(params.radiusM ?? 5000),
  });
  const res = await fetch(`${API_URL}/sessions/nearby?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(res);
}

export async function createSession(
  token: string,
  session: CreateSessionInput
): Promise<{ session: Session }> {
  const res = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(session),
  });
  return parseJsonOrThrow(res);
}

export async function changeSessionStatus(
  token: string,
  sessionId: string,
  action: "start" | "end"
): Promise<{ session: Session }> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(res);
}

export async function toggleSessionRsvp(
  token: string,
  sessionId: string
): Promise<{ rsvpStatus: "heading_there" | "cancelled" }> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/rsvp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(res);
}

export async function fetchSessionDirections(
  token: string,
  sessionId: string
): Promise<{ anchor: { latitude: number; longitude: number } }> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/directions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(res);
}

export async function sendSessionLocation(
  token: string,
  sessionId: string,
  location: { latitude: number; longitude: number; accuracyM: number }
): Promise<{ attendanceStatus: "heading_there" | "checked_in" }> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/location`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(location),
  });
  return parseJsonOrThrow(res);
}
