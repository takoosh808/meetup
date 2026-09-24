import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { createGroup, decideFriendRequest, fetchFriendEvents, fetchFriendships, fetchGroupEvents, fetchGroups, findUserByUsername, joinGroup, sendFriendRequest, type CommunityEvent, type Friendship, type Group } from "../auth/api";

function EventPanel({ title, events }: { title: string; events: CommunityEvent[] }) {
  return <aside className="community-event-panel" aria-label={`${title} events`}><h3>{title} events</h3>{events.length === 0 ? <p className="empty-state">No upcoming or live events.</p> : events.map((event) => <article className="community-event" key={event.id}><strong>{event.title}</strong><span>{event.status} · {new Date(event.scheduled_at).toLocaleString()}</span></article>)}</aside>;
}

export function CommunityHub() {
  const { token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [groupName, setGroupName] = useState("");
  const [username, setUsername] = useState("");
  const [section, setSection] = useState<"groups" | "friends">("groups");
  const [eventsTitle, setEventsTitle] = useState<string | null>(null);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!token) return;
    const [groupResponse, friendResponse] = await Promise.all([fetchGroups(token), fetchFriendships(token)]);
    setGroups(groupResponse.groups); setFriendships(friendResponse.friendships);
  }
  useEffect(() => { reload().catch(() => setError("Unable to load your community")); }, [token]);
  async function run(action: () => Promise<unknown>, fallback: string) { try { await action(); await reload(); } catch (e) { setError(e instanceof Error ? e.message : fallback); } }
  async function showGroupEvents(group: Group) { try { const response = await fetchGroupEvents(token!, group.id); setEvents(response.events); setEventsTitle(group.name); } catch { setError("Unable to load group events"); } }
  async function showFriendEvents(friend: Friendship) { const friendId = friend.incoming ? friend.requester_id : friend.addressee_id; try { const response = await fetchFriendEvents(token!, friendId); setEvents(response.events); setEventsTitle(friend.incoming ? friend.requester_name : friend.addressee_name); } catch { setError("Unable to load friend events"); } }

  return <section className="community-hub" aria-labelledby="community-heading">
    <div className="section-heading"><div><p className="eyebrow">Community</p><h2 id="community-heading">Your people</h2></div></div>
    <nav className="community-tabs" aria-label="Community sections"><button className={section === "groups" ? "community-tab active" : "community-tab"} type="button" onClick={() => setSection("groups")}>Groups</button><button className={section === "friends" ? "community-tab active" : "community-tab"} type="button" onClick={() => setSection("friends")}>Friends</button></nav>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {section === "groups" ? <div className="community-section">
      <div className="community-actions"><input aria-label="New group name" placeholder="Create a group" value={groupName} onChange={(e) => setGroupName(e.target.value)} /><button className="secondary-action" type="button" onClick={() => void run(async () => { if (token && groupName.trim()) { await createGroup(token, { name: groupName.trim() }); setGroupName(""); } }, "Unable to create group")}>Create</button></div>
      <div className="community-list">{groups.map((group) => <article className="community-card" key={group.id}><div><h3>{group.name}</h3><p>Admin: {group.owner_name} · {group.member_count} members</p></div><div className="community-card-actions">{group.is_member ? <button className="secondary-action" type="button" onClick={() => void showGroupEvents(group)}>View events</button> : <button className="primary-action compact-action" type="button" onClick={() => void run(() => joinGroup(token!, group.id), "Unable to join group")}>Join</button>}</div></article>)}</div>
    </div> : <div className="community-section">
      <div className="community-actions"><input aria-label="Friend username" placeholder="Add friend by username" value={username} onChange={(e) => setUsername(e.target.value)} /><button className="secondary-action" type="button" onClick={() => void run(async () => { if (token && username.trim()) { const found = await findUserByUsername(token, username); await sendFriendRequest(token, found.user.id); setUsername(""); } }, "Unable to find or add friend")}>Add friend</button></div>
      <h3 className="community-subheading">Friends</h3><div className="community-list">{friendships.filter((f) => f.status === "accepted").map((friend) => <article className="community-card" key={`${friend.requester_id}-${friend.addressee_id}`}><div><h3>{friend.incoming ? friend.requester_name : friend.addressee_name}</h3><p>Accepted friend</p></div><button className="secondary-action" type="button" onClick={() => void showFriendEvents(friend)}>View events</button></article>)}</div>
      <h3 className="community-subheading">Friend requests</h3><div className="community-list">{friendships.filter((f) => f.status === "pending").map((friend) => <article className="community-card" key={`${friend.requester_id}-${friend.addressee_id}`}><div><h3>{friend.incoming ? friend.requester_name : friend.addressee_name}</h3><p>{friend.incoming ? "Incoming request" : "Request sent"}</p></div>{friend.incoming && <div className="community-card-actions"><button className="primary-action compact-action" type="button" onClick={() => void run(() => decideFriendRequest(token!, friend.requester_id, "accept"), "Unable to accept request")}>Accept</button><button className="secondary-action" type="button" onClick={() => void run(() => decideFriendRequest(token!, friend.requester_id, "reject"), "Unable to decline request")}>Decline</button></div>}</article>)}</div>
    </div>}
    {eventsTitle && <><EventPanel title={eventsTitle} events={events} /><button className="text-action" type="button" onClick={() => setEventsTitle(null)}>Close event details</button></>}
  </section>;
}
