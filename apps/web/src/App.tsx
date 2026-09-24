import { useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { LoginForm } from "./auth/LoginForm";
import { SignupForm } from "./auth/SignupForm";
import { ProfileView } from "./auth/ProfileView";

function App() {
  const { user, isLoading, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  return (
    <main className="app-shell">
      <section className={user ? "dashboard-panel" : "auth-panel"} aria-label="Meetup account">
        {user ? (
          <header className="dashboard-brand">
            <h1>Meetup</h1>
            <button className="logout-arrow" type="button" onClick={logout} aria-label="Log out" title="Log out">→</button>
          </header>
        ) : (
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">M</span>
            <h1>Meetup</h1>
          </div>
        )}
        {isLoading ? (
          <p>Loading your profile...</p>
        ) : user ? (
          <ProfileView />
        ) : mode === "login" ? (
          <LoginForm
            notice={loginNotice}
            onSwitchToSignup={() => {
              setLoginNotice(null);
              setMode("signup");
            }}
          />
        ) : (
          <SignupForm
            onSwitchToLogin={(message) => {
              setLoginNotice(message ?? null);
              setMode("login");
            }}
          />
        )}
      </section>
    </main>
  );
}

export default App;
