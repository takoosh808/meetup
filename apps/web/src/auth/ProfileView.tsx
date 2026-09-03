import { useAuth } from "./AuthContext";

export function ProfileView() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="profile-panel">
      <h2>Welcome, {user.displayName}</h2>
      <p className="profile-email">{user.email}</p>
      <button className="primary-action" type="button" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
