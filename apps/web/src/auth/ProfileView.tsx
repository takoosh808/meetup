import { useAuth } from "./AuthContext";
import { SessionManager } from "../sessions/SessionManager";
import { ExploreView } from "../explore/ExploreView";
import { NotificationSettings } from "../notifications/NotificationSettings";

export function ProfileView() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <>
      <section className="profile-summary">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Welcome, {user.displayName}</h2>
          <p className="profile-email">{user.email}</p>
        </div>
        <button className="text-action" type="button" onClick={logout}>Log out</button>
      </section>
      <NotificationSettings />
      <ExploreView />
      <SessionManager />
    </>
  );
}
