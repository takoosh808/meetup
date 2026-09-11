import { useState } from "react";
import { useAuth } from "./AuthContext";
import { SessionManager } from "../sessions/SessionManager";
import { ExploreView } from "../explore/ExploreView";
import { NotificationSettings } from "../notifications/NotificationSettings";
import { CommunityHub } from "../community/CommunityHub";

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
      {activeTab === "profile" && <NotificationSettings />}
    </>
  );
}
