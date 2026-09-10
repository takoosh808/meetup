import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { createGroup, fetchFriendships, fetchGroups, sendFriendRequest, type Friendship, type Group } from "../auth/api";

export function CommunityHub() {
  const { token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [groupName, setGroupName] = useState("");
  const [friendId, setFriendId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([fetchGroups(token), fetchFriendships(token)])
      .then(([groupResponse, friendResponse]) => {
        setGroups(groupResponse.groups);
        setFriendships(friendResponse.friendships);
      })
      .catch(() => setError("Unable to load your community"));
  }, [token]);

  async function handleCreateGroup() {
    if (!token || !groupName.trim()) return;
    try {
      const response = await createGroup(token, { name: groupName.trim() });
      setGroups((current) => [response.group, ...current]);
      setGroupName("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create group");
    }
  }

  async function handleFriendRequest() {
    if (!token || !friendId.trim()) return;
    try {
      await sendFriendRequest(token, friendId.trim());
      const response = await fetchFriendships(token);
      setFriendships(response.friendships);
      setFriendId("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send friend request");
    }
  }

  return (
    <section className="community-hub" aria-labelledby="community-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Community</p>
          <h2 id="community-heading">Your people</h2>
        </div>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="community-actions">
        <input aria-label="New group name" placeholder="New group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
        <button className="secondary-action" type="button" onClick={() => void handleCreateGroup()}>Create group</button>
      </div>
      <div className="community-actions">
        <input aria-label="Friend user ID" placeholder="Friend user ID" value={friendId} onChange={(event) => setFriendId(event.target.value)} />
        <button className="secondary-action" type="button" onClick={() => void handleFriendRequest()}>Add friend</button>
      </div>
      <div className="community-list">
        {groups.map((group) => <article className="community-row" key={group.id}><strong>{group.name}</strong><span>{group.member_count} members</span></article>)}
        {friendships.map((friendship) => <article className="community-row" key={`${friendship.requester_id}-${friendship.addressee_id}`}><strong>{friendship.requester_name} ↔ {friendship.addressee_name}</strong><span>{friendship.status}</span></article>)}
      </div>
    </section>
  );
}