import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { deleteAdminUser, endAdminEvent, fetchAdminEvents, fetchAdminGroups, fetchAdminUsers, updateAdminUser, type AdminEvent, type AdminGroup, type AdminUser } from "../auth/api";

export function AdminHub() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editAdmin, setEditAdmin] = useState(false);

  async function reload() {
    if (!token) return;
    const [userResponse, eventResponse, groupResponse] = await Promise.all([
      fetchAdminUsers(token), fetchAdminEvents(token), fetchAdminGroups(token),
    ]);
    setUsers(userResponse.users); setEvents(eventResponse.events); setGroups(groupResponse.groups);
  }
  useEffect(() => { reload().catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load admin data")); }, [token]);

  function beginEdit(user: AdminUser) {
    setEditingUserId(user.id); setEditEmail(user.email); setEditName(user.display_name); setEditAdmin(user.is_admin);
  }

  async function saveEdit() {
    if (!token || !editingUserId) return;
    try { await updateAdminUser(token, editingUserId, { email: editEmail, displayName: editName, isAdmin: editAdmin }); await reload(); setEditingUserId(null); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update user"); }
  }

  async function removeUser(userId: string) {
    if (!token || !window.confirm("Remove this user and their data?")) return;
    try { await deleteAdminUser(token, userId); await reload(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to remove user"); }
  }

  return (
    <section className="admin-hub" aria-labelledby="admin-heading">
      <p className="eyebrow">Admin</p>
      <h2 id="admin-heading">Manage Meetup</h2>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="admin-summary"><span><strong>{users.length}</strong> users</span><span><strong>{events.length}</strong> events</span><span><strong>{groups.length}</strong> groups</span></div>
      <h3>Users</h3>
      <div className="admin-list">{users.map((user) => <article className="admin-row" key={user.id}>{editingUserId === user.id ? <div className="admin-edit-fields"><input aria-label="Edit display name" value={editName} onChange={(event) => setEditName(event.target.value)} /><input aria-label="Edit email" type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} /><label><input type="checkbox" checked={editAdmin} onChange={(event) => setEditAdmin(event.target.checked)} /> Admin</label></div> : <div><strong>{user.display_name}</strong><small>{user.email}</small></div>}<div className="admin-row-actions">{editingUserId === user.id ? <><button className="primary-action compact-action" type="button" onClick={() => void saveEdit()}>Save</button><button className="secondary-action" type="button" onClick={() => setEditingUserId(null)}>Cancel</button></> : <><span>{user.is_admin ? "Admin" : "Member"}</span><button className="secondary-action" type="button" onClick={() => beginEdit(user)}>Edit</button><button className="secondary-action danger-action" type="button" onClick={() => void removeUser(user.id)}>Remove</button></>}</div></article>)}</div>
      <h3>Events</h3>
      <div className="admin-list">{events.map((event) => <article className="admin-row" key={event.id}><div><strong>{event.title}</strong><small>{event.host_name} · {event.attendee_count} attending</small></div>{event.status !== "ended" && <button className="secondary-action" type="button" onClick={() => void endAdminEvent(token!, event.id).then(reload)}>End</button>}</article>)}</div>
      <h3>Groups</h3>
      <div className="admin-list">{groups.map((group) => <article className="admin-row" key={group.id}><div><strong>{group.name}</strong><small>Admin: {group.owner_name} · {group.member_count} members</small></div></article>)}</div>
    </section>
  );
}