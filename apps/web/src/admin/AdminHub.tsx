import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { endAdminEvent, fetchAdminEvents, fetchAdminGroups, fetchAdminUsers, type AdminEvent, type AdminGroup, type AdminUser } from "../auth/api";

export function AdminHub() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!token) return;
    const [userResponse, eventResponse, groupResponse] = await Promise.all([
      fetchAdminUsers(token), fetchAdminEvents(token), fetchAdminGroups(token),
    ]);
    setUsers(userResponse.users); setEvents(eventResponse.events); setGroups(groupResponse.groups);
  }
  useEffect(() => { reload().catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load admin data")); }, [token]);

  return (
    <section className="admin-hub" aria-labelledby="admin-heading">
      <p className="eyebrow">Admin</p>
      <h2 id="admin-heading">Manage Meetup</h2>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="admin-summary"><span><strong>{users.length}</strong> users</span><span><strong>{events.length}</strong> events</span><span><strong>{groups.length}</strong> groups</span></div>
      <h3>Users</h3>
      <div className="admin-list">{users.map((user) => <article className="admin-row" key={user.id}><div><strong>{user.display_name}</strong><small>{user.email}</small></div><span>{user.is_admin ? "Admin" : "Member"}</span></article>)}</div>
      <h3>Events</h3>
      <div className="admin-list">{events.map((event) => <article className="admin-row" key={event.id}><div><strong>{event.title}</strong><small>{event.host_name} · {event.attendee_count} attending</small></div>{event.status !== "ended" && <button className="secondary-action" type="button" onClick={() => void endAdminEvent(token!, event.id).then(reload)}>End</button>}</article>)}</div>
      <h3>Groups</h3>
      <div className="admin-list">{groups.map((group) => <article className="admin-row" key={group.id}><div><strong>{group.name}</strong><small>Admin: {group.owner_name} · {group.member_count} members</small></div></article>)}</div>
    </section>
  );
}