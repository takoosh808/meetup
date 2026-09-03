import { useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { LoginForm } from "./auth/LoginForm";
import { SignupForm } from "./auth/SignupForm";
import { ProfileView } from "./auth/ProfileView";

function App() {
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <main className="app-shell">
      <section className="auth-panel" aria-label="Meetup account">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">M</span>
          <h1>Meetup</h1>
        </div>
        {isLoading ? (
          <p>Loading your profile...</p>
        ) : user ? (
          <ProfileView />
        ) : mode === "login" ? (
          <LoginForm onSwitchToSignup={() => setMode("signup")} />
        ) : (
          <SignupForm onSwitchToLogin={() => setMode("login")} />
        )}
      </section>
    </main>
  );
}

export default App;
