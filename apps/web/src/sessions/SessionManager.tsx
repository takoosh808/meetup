import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  changeSessionStatus,
  createSession,
  fetchMySessions,
  type ActivityType,
  type Session,
} from "../auth/api";

const defaultScheduledTime = "2026-09-06T14:00";

export function SessionManager() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [title, setTitle] = useState("Sunday Beach Volleyball");
  const [activityType, setActivityType] = useState<ActivityType>("volleyball");
  const [description, setDescription] = useState("Open play at the south courts.");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledTime);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchMySessions(token)
      .then((response) => setSessions(response.sessions))
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Unable to load sessions");
      });
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await createSession(token, {
        title,
        activityType,
        description,
        scheduledAt: new Date(scheduledAt).toISOString(),
        broadcastRadiusM: 150,
        checkinRadiusM: 40,
        shutoffRadiusM: 300,
      });
      setSessions((current) => [...current, response.session]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create session");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(sessionId: string, action: "start" | "end") {
    if (!token) return;
    setError(null);
    try {
      const response = await changeSessionStatus(token, sessionId, action);
      setSessions((current) =>
        current.map((session) => (session.id === sessionId ? response.session : session))
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update session");
    }
  }

  return (
    <section className="sessions" aria-labelledby="session-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Host a plan</p>
          <h2 id="session-heading">Your sessions</h2>
        </div>
      </div>

      <form className="session-form" onSubmit={handleSubmit}>
        <label>
          Session title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <div className="form-row">
          <label>
            Activity
            <select
              value={activityType}
              onChange={(event) => setActivityType(event.target.value as ActivityType)}
            >
              <option value="volleyball">Volleyball</option>
              <option value="basketball">Basketball</option>
              <option value="soccer">Soccer</option>
              <option value="running">Running</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Starts
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Details
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating session..." : "Create session"}
        </button>
      </form>

      <div className="session-list">
        {sessions.length === 0 ? (
          <p className="empty-state">No sessions yet. Start with your Sunday volleyball meetup.</p>
        ) : (
          sessions.map((session) => (
            <article className="session-row" key={session.id}>
              <div>
                <p className="session-status">{session.status}</p>
                <h3>{session.title}</h3>
                <p>{new Date(session.scheduled_at).toLocaleString()}</p>
              </div>
              {session.status === "scheduled" && (
                <button type="button" className="text-action" onClick={() => updateStatus(session.id, "start")}>
                  Start
                </button>
              )}
              {session.status === "live" && (
                <button type="button" className="text-action" onClick={() => updateStatus(session.id, "end")}>
                  End
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}