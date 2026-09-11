import { useState } from "react";
import { useAuth } from "./AuthContext";
import { SessionManager } from "../sessions/SessionManager";
import { ExploreView } from "../explore/ExploreView";
import { NotificationSettings } from "../notifications/NotificationSettings";
import { CommunityHub } from "../community/CommunityHub";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function ProfileView() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"explore" | "host" | "community" | "profile">("explore");
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
      <nav className="dashboard-tabs" aria-label="Dashboard sections">
        {([
          ["explore", "Explore"],
          ["host", "Host"],
          ["community", "Community"],
          ["profile", "Profile"],
        ] as const).map(([tab, label]) => (
          <button
            className={activeTab === tab ? "dashboard-tab active" : "dashboard-tab"}
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </nav>
      {activeTab === "explore" && <ExploreView />}
      {activeTab === "host" && <SessionManager />}
      {activeTab === "community" && <CommunityHub />}
      {activeTab === "profile" && (
        <section className="profile-settings" aria-labelledby="profile-settings-heading">
          <p className="eyebrow">Account</p>
          <h2 id="profile-settings-heading">Profile details</h2>
          <dl className="profile-details">
            <div><dt>Name</dt><dd>{user.displayName}</dd></div>
            <div><dt>User ID</dt><dd>{user.id}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
          </dl>
          <NotificationSettings />
          <details className="password-settings">
            <summary>Change password</summary>
            <ChangePasswordForm />
          </details>
        </section>
      )}
    </>
  );
}
