import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { createGroup, decideFriendRequest, fetchFriendships, fetchGroups, joinGroup, sendFriendRequest, setFriendPriority, setGroupPriority, type Friendship, type Group } from "../auth/api";

export function CommunityHub() {
  const { token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [groupName, setGroupName] = useState("");
  const [friendId, setFriendId] = useState("");
  const [section, setSection] = useState<"groups" | "friends">("groups");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!token) return;
    const [groupResponse, friendResponse] = await Promise.all([fetchGroups(token), fetchFriendships(token)]);
    setGroups(groupResponse.groups);
    setFriendships(friendResponse.friendships);
  }

  useEffect(() => { reload().catch(() => setError("Unable to load your community")); }, [token]);

  async function run(action: () => Promise<unknown>, fallback: string) {
    try { await action(); await reload(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : fallback); }
  }

  return (
    <section className="community-hub" aria-labelledby="community-heading">
      <div className="section-heading"><div><p className="eyebrow">Community</p><h2 id="community-heading">Your people</h2></div></div>
      <nav className="community-tabs" aria-label="Community sections">
        <button className={section === "groups" ? "community-tab active" : "community-tab"} type="button" onClick={() => setSection("groups")}>Groups</button>
        <button className={section === "friends" ? "community-tab active" : "community-tab"} type="button" onClick={() => setSection("friends")}>Friends</button>
      </nav>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {section === "groups" ? (
        <div className="community-section">
          <div className="community-actions"><input aria-label="New group name" placeholder="Create a group" value={groupName} onChange={(event) => setGroupName(event.target.value)} /><button className="secondary-action" type="button" onClick={() => void run(async () => { if (token && groupName.trim()) { await createGroup(token, { name: groupName.trim() }); setGroupName(""); } }, "Unable to create group")}>Create</button></div>
          <div className="community-list">{groups.map((group) => <article className="community-card" key={group.id}><div><h3>{group.name}</h3><p>{group.description || "Community group"}</p><small>Admin: {group.owner_name} · {group.member_count} members</small></div><div className="community-card-actions">{group.is_member ? <button className="secondary-action" type="button" onClick={() => void run(() => setGroupPriority(token!, group.id, !group.priority_updates), "Unable to update group alerts")}>{group.priority_updates ? "Priority on" : "Prioritize"}</button> : <button className="primary-action compact-action" type="button" onClick={() => void run(() => joinGroup(token!, group.id), "Unable to join group")}>Join</button>}</div></article>)}</div>
        </div>
      ) : (
        <div className="community-section">
          <div className="community-actions"><input aria-label="Friend user ID" placeholder="Add friend by user ID" value={friendId} onChange={(event) => setFriendId(event.target.value)} /><button className="secondary-action" type="button" onClick={() => void run(async () => { if (token && friendId.trim()) { await sendFriendRequest(token, friendId.trim()); setFriendId(""); } }, "Unable to send friend request")}>Add</button></div>
          <h3 className="community-subheading">Friends</h3>
          <div className="community-list">{friendships.filter((friend) => friend.status === "accepted").map((friend) => <article className="community-card" key={`${friend.requester_id}-${friend.addressee_id}`}><div><h3>{friend.incoming ? friend.requester_name : friend.addressee_name}</h3><p>Connected friend</p></div><button className="secondary-action" type="button" onClick={() => void run(() => setFriendPriority(token!, friend.incoming ? friend.requester_id : friend.addressee_id, !friend.priority_updates), "Unable to update friend alerts")}>{friend.priority_updates ? "Priority on" : "Prioritize"}</button></article>)}</div>
          <h3 className="community-subheading">Friend requests</h3>
          <div className="community-list">{friendships.filter((friend) => friend.status === "pending").map((friend) => <article className="community-card" key={`${friend.requester_id}-${friend.addressee_id}`}><div><h3>{friend.incoming ? friend.requester_name : friend.addressee_name}</h3><p>{friend.incoming ? "Incoming request" : "Request sent"}</p></div>{friend.incoming && <div className="community-card-actions"><button className="primary-action compact-action" type="button" onClick={() => void run(() => decideFriendRequest(token!, friend.requester_id, "accept"), "Unable to accept request")}>Accept</button><button className="secondary-action" type="button" onClick={() => void run(() => decideFriendRequest(token!, friend.requester_id, "reject"), "Unable to decline request")}>Decline</button></div>}</article>)}</div>
        </div>
      )}
    </section>
  );
}
