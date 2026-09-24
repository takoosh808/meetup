export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "member";
  member_count: number;
  owner_name: string;
  is_member: boolean;
  priority_updates: boolean;
}

export interface Friendship {
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  requester_name: string;
  addressee_name: string;
  incoming: boolean;
  priority_updates: boolean;
}

export interface AdminUser { id: string; email: string; display_name: string; is_admin: boolean; created_at: string; }
export interface AdminEvent { id: string; title: string; activity_type: string; status: string; scheduled_at: string; host_name: string; attendee_count: number; }
export interface AdminGroup { id: string; name: string; description: string | null; owner_name: string; member_count: number; }

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
  has_anchor?: boolean;
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
  groupId?: string;
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

export async function changePassword(
  token: string,
  passwords: { currentPassword: string; newPassword: string }
) {
  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(passwords),
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

export async function sendHostLocation(
  token: string,
  sessionId: string,
  location: { latitude: number; longitude: number; accuracyM: number }
): Promise<{ status: "live" | "ended" }> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/host-location`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(location),
  });
  return parseJsonOrThrow(res);
}

export async function fetchNotificationConfig(token: string): Promise<{ publicKey: string | null }> {
  const res = await fetch(`${API_URL}/notifications/config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(res);
}

export async function savePushSubscription(token: string, subscription: PushSubscription) {
  const json = subscription.toJSON();
  const res = await fetch(`${API_URL}/notifications/subscription`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return parseJsonOrThrow(res);
}

export async function removePushSubscription(token: string, endpoint: string) {
  const res = await fetch(`${API_URL}/notifications/subscription`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  return parseJsonOrThrow(res);
}

export async function fetchAdminUsers(token: string): Promise<{ users: AdminUser[] }> {
  const res = await fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
  return parseJsonOrThrow(res);
}
export async function fetchAdminEvents(token: string): Promise<{ events: AdminEvent[] }> {
  const res = await fetch(`${API_URL}/admin/events`, { headers: { Authorization: `Bearer ${token}` } });
  return parseJsonOrThrow(res);
}
export async function fetchAdminGroups(token: string): Promise<{ groups: AdminGroup[] }> {
  const res = await fetch(`${API_URL}/admin/groups`, { headers: { Authorization: `Bearer ${token}` } });
  return parseJsonOrThrow(res);
}
export async function updateAdminUser(token: string, userId: string, user: { email: string; displayName: string; isAdmin: boolean }) {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(user) });
  return parseJsonOrThrow(res);
}
export async function deleteAdminUser(token: string, userId: string) {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  return parseJsonOrThrow(res);
}
export async function endAdminEvent(token: string, eventId: string) {
  const res = await fetch(`${API_URL}/admin/events/${eventId}/end`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  return parseJsonOrThrow(res);
}

export async function fetchGroups(token: string): Promise<{ groups: Group[] }> {
  const res = await fetch(`${API_URL}/community/groups`, { headers: { Authorization: `Bearer ${token}` } });
  return parseJsonOrThrow(res);
}

export async function createGroup(token: string, group: { name: string; description?: string }) {
  const res = await fetch(`${API_URL}/community/groups`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(group),
  });
  return parseJsonOrThrow(res);
}

export async function fetchFriendships(token: string): Promise<{ friendships: Friendship[] }> {
  const res = await fetch(`${API_URL}/community/friends`, { headers: { Authorization: `Bearer ${token}` } });
  return parseJsonOrThrow(res);
}

export async function sendFriendRequest(token: string, userId: string) {
  const res = await fetch(`${API_URL}/community/friends/requests`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return parseJsonOrThrow(res);
}

export async function joinGroup(token: string, groupId: string) {
  const res = await fetch(`${API_URL}/community/groups/${groupId}/members`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({}) });
  return parseJsonOrThrow(res);
}

export async function setGroupPriority(token: string, groupId: string, priority: boolean) {
  const res = await fetch(`${API_URL}/community/groups/${groupId}/priority`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ priority }) });
  return parseJsonOrThrow(res);
}

export async function decideFriendRequest(token: string, requesterId: string, decision: "accept" | "reject") {
  const res = await fetch(`${API_URL}/community/friends/requests/${requesterId}/${decision}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  return parseJsonOrThrow(res);
}

export async function setFriendPriority(token: string, friendId: string, priority: boolean) {
  const res = await fetch(`${API_URL}/community/friends/${friendId}/priority`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ priority }) });
  return parseJsonOrThrow(res);
}
