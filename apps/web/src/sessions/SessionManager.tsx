import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  changeSessionStatus,
  createSession,
  fetchMySessions,
  sendHostLocation,
  type ActivityType,
  fetchGroups,
  type Session,
} from "../auth/api";
import type { Group } from "../auth/api";

const defaultScheduledTime = "2026-09-06T14:00";

export function SessionManager() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [title, setTitle] = useState("Sunday Beach Volleyball");
  const [activityType, setActivityType] = useState<ActivityType>("volleyball");
  const [description, setDescription] = useState("Open play at the south courts.");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledTime);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ latitude: number; longitude: number; accuracyM: number }>();
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [activeView, setActiveView] = useState<"create" | "host">("create");

  useEffect(() => {
    if (!token) return;
    fetchMySessions(token)
      .then((response) => setSessions(response.sessions))
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Unable to load sessions");
      });
    fetchGroups(token).then((response) => setGroups(response.groups)).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const refresh = () => fetchMySessions(token).then((response) => setSessions(response.sessions)).catch(() => undefined);
    const intervalId = window.setInterval(refresh, 15000);
    return () => window.clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    if (!token || !navigator.geolocation?.watchPosition) return;
    const liveSessions = sessions.filter((session) => session.status === "live" && session.has_anchor);
    if (liveSessions.length === 0) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        };
        Promise.all(liveSessions.map((session) => sendHostLocation(token, session.id, location)))
          .then((responses) => {
            setSessions((current) => current.map((session) => {
              const responseIndex = liveSessions.findIndex((liveSession) => liveSession.id === session.id);
              const response = responses[responseIndex];
              return response?.status === "ended" ? { ...session, status: "ended" } : session;
            }));
          })
          .catch((requestError) => {
            setError(requestError instanceof Error ? requestError.message : "Unable to update hosting location");
          });
      },
      () => setError("Hosting location updates are unavailable; keep this tab open to stay live."),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sessions, token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const eventAnchor = anchor ?? await captureAnchor();
      if (!eventAnchor) {
        throw new Error("Location permission is required to create an event.");
      }
      const response = await createSession(token, {
        title,
        activityType,
        description,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        broadcastRadiusM: 150,
        checkinRadiusM: 40,
        shutoffRadiusM: 300,
        anchor: eventAnchor,
        groupId: groupId || undefined,
      });
      setSessions((current) => [...current, response.session]);
      setActiveView("host");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create session");
    } finally {
      setIsSubmitting(false);
    }
  }

  function captureAnchor(): Promise<{ latitude: number; longitude: number; accuracyM: number } | undefined> {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser");
      return Promise.resolve(undefined);
    }
    setError(null);
    setIsLocating(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextAnchor = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: position.coords.accuracy,
          };
          setAnchor(nextAnchor);
          setIsLocating(false);
          resolve(nextAnchor);
        },
        () => {
          setError("Location permission is required to create an event.");
          setIsLocating(false);
          resolve(undefined);
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
      );
    });
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

  const liveSession = sessions.find((session) => session.status === "live");
  const remainingMinutes = liveSession
    ? Math.max(0, Math.ceil((new Date(liveSession.scheduled_at).getTime() + liveSession.duration_minutes * 60000 - Date.now()) / 60000))
    : 0;
  const previousSessions = sessions.filter((session) => session.status === "ended");

  return (
    <section className="sessions" aria-labelledby="session-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Host a plan</p>
          <h2 id="session-heading">Your sessions</h2>
        </div>
      </div>

      <nav className="host-tabs" aria-label="Host sections">
        <button className={activeView === "create" ? "host-tab active" : "host-tab"} type="button" onClick={() => setActiveView("create")}>Create</button>
        <button className={activeView === "host" ? "host-tab active" : "host-tab"} type="button" onClick={() => setActiveView("host")}>Host</button>
      </nav>

      {activeView === "create" && <form className="session-form" onSubmit={handleSubmit}>
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
        <label>
          Event length (minutes)
            <input type="number" min={15} max={720} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} required />
        </label>
        {groups.length > 0 && (
          <label>
            Group alert
            <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">No group</option>
              {groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}
            </select>
          </label>
        )}
        <p className="location-help">Your current location is required and will remain active while hosting.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating session..." : "Create session"}
        </button>
      </form>}

      {activeView === "host" && <>
      {liveSession ? (
        <aside className="host-control-panel" aria-live="polite">
          <div className="section-heading">
            <div><p className="eyebrow">Hosting live</p><h3>{liveSession.title}</h3></div>
            <span className="detail-status live">Live now</span>
          </div>
          <div className="host-stat-grid">
            <span><strong>{liveSession.checked_in_count ?? 0}</strong><small>Checked in</small></span>
            <span><strong>{liveSession.heading_there_count ?? 0}</strong><small>Heading there</small></span>
            <span><strong>{remainingMinutes}</strong><small>Minutes remaining</small></span>
          </div>
          <button className="secondary-action danger-action" type="button" onClick={() => void updateStatus(liveSession.id, "end")}>End event</button>
        </aside>
      ) : <p className="empty-state">No event is live. Create an event, then start hosting it here.</p>}

      <div className="session-list previous-events">
        <h3>All events</h3>
        {sessions.length === 0 ? <p className="empty-state">No events yet.</p> : sessions.map((session) => (
          <article className="session-row" key={session.id}>
            <div><p className="session-status">{session.status}</p><h3>{session.title}</h3><p>{new Date(session.scheduled_at).toLocaleString()}</p></div>
            <div className="host-live-summary">
              <span>{session.checked_in_count ?? 0} checked in</span>
              <span>{session.heading_there_count ?? 0} heading there</span>
            </div>
          </article>
        ))}
      </div>
      </>}

      {activeView === "host" && sessions.some((session) => session.status === "scheduled") && (
        <div className="session-list scheduled-events">
          <h3>Scheduled events</h3>
          {sessions.filter((session) => session.status === "scheduled").map((session) => (
            <article className="session-row" key={session.id}>
              <div><p className="session-status">Scheduled</p><h3>{session.title}</h3><p>{new Date(session.scheduled_at).toLocaleString()}</p></div>
              <button type="button" className="text-action" onClick={() => updateStatus(session.id, "start")}>Start</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}