import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "../notifications/useNotifications";
import {
  fetchNearbySessions,
  fetchSessionDirections,
  sendSessionLocation,
  toggleSessionRsvp,
  type Session,
} from "../auth/api";

const defaultCenter: [number, number] = [34.0195, -118.4912];

function isAttendanceActive(session: Session | null) {
  return session?.current_user_rsvp === "heading_there" || session?.current_user_rsvp === "checked_in";
}

export function ExploreView() {
  const { token } = useAuth();
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const latestPosition = useRef<GeolocationPosition | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [locationState, setLocationState] = useState("Showing nearby events");
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isHeadingThere, setIsHeadingThere] = useState(false);
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const previousStatuses = useRef<Record<string, Session["status"]>>({});
  const hasLoadedNearby = useRef(false);
  const { notify } = useNotifications();
  const isCheckedIn = selectedSession?.current_user_rsvp === "checked_in";
  const [isWithinCheckinRadius, setIsWithinCheckinRadius] = useState(false);

  useEffect(() => {
    if (!mapElement.current || map.current) return;
    map.current = L.map(mapElement.current, { zoomControl: false }).setView(defaultCenter, 13);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map.current);
    markers.current = L.layerGroup().addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const loadNearby = (position: GeolocationPosition) => {
      const nextCenter: [number, number] = [position.coords.latitude, position.coords.longitude];
      setCenter(nextCenter);
      setLocationState("Using your current area");
      map.current?.setView(nextCenter, 13);
      fetchNearbySessions(token, { latitude: nextCenter[0], longitude: nextCenter[1] })
        .then((response) => setSessions(response.sessions))
        .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load nearby sessions"));
    };

    if (!navigator.geolocation) {
      setLocationState("Showing the starter area");
      fetchNearbySessions(token, { latitude: defaultCenter[0], longitude: defaultCenter[1] })
        .then((response) => setSessions(response.sessions))
        .catch(() => setError("Unable to load nearby sessions"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      loadNearby,
      () => {
        setLocationState("Showing the starter area");
        fetchNearbySessions(token, { latitude: defaultCenter[0], longitude: defaultCenter[1] })
          .then((response) => setSessions(response.sessions))
          .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load nearby sessions"));
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
    );
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const refresh = () => {
      fetchNearbySessions(token, { latitude: center[0], longitude: center[1] })
        .then((response) => {
          if (hasLoadedNearby.current) {
            response.sessions.forEach((session) => {
              if (
                session.status === "live" &&
                previousStatuses.current[session.id] !== "live" &&
                session.current_user_rsvp === "heading_there"
              ) {
                notify(`${session.title} is live`, {
                  body: "Your session is happening now.",
                  tag: `meetup-session-${session.id}`,
                });
              }
            });
          }
          previousStatuses.current = Object.fromEntries(
            response.sessions.map((session) => [session.id, session.status])
          );
          hasLoadedNearby.current = true;
          setSessions(response.sessions);
        })
        .catch(() => setError("Unable to refresh nearby sessions"));
    };
    const intervalId = window.setInterval(refresh, 30000);
    return () => window.clearInterval(intervalId);
  }, [center, notify, token]);

  useEffect(() => {
    if (!map.current || !markers.current) return;
    if (!mapElement.current?.clientWidth || !mapElement.current.clientHeight) return;
    markers.current.clearLayers();
    sessions.forEach((session) => {
      if (session.map_latitude === undefined || session.map_longitude === undefined) return;
      const marker = L.circleMarker([session.map_latitude, session.map_longitude], {
        radius: session.status === "live" ? 10 : 8,
        color: "#0b3d2f",
        weight: 3,
        fillColor: "#49dda9",
        fillOpacity: 0.95,
      });
      marker.bindPopup(`<strong>${session.title}</strong><br>${session.status} · ${session.activity_type}`);
      marker.on("click", () => {
        setSelectedSession(session);
        setIsHeadingThere(isAttendanceActive(session));
        setIsWithinCheckinRadius(session.current_user_rsvp === "checked_in");
      });
      markers.current?.addLayer(marker);
      if (markers.current) {
        L.circle([session.map_latitude, session.map_longitude], {
          radius: session.checkin_radius_m,
          color: "#49dda9",
          weight: 1,
          opacity: 0.65,
          fillColor: "#49dda9",
          fillOpacity: 0.04,
        }).addTo(markers.current);
      }
    });
    L.circle(center, { radius: 150, color: "#49dda9", weight: 1, fillOpacity: 0.06 }).addTo(markers.current);
  }, [center, sessions]);

  useEffect(() => {
    if (!token || !selectedSession || !isAttendanceActive(selectedSession) || !navigator.geolocation?.watchPosition) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        latestPosition.current = position;
        sendSessionLocation(token, selectedSession.id, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        })
          .then(({ attendanceStatus }) => {
            setIsWithinCheckinRadius(attendanceStatus === "checked_in");
            setSelectedSession((current) => current ? {
              ...current,
              current_user_rsvp: attendanceStatus,
            } : current);
          })
          .catch((requestError) => {
            setError(requestError instanceof Error ? requestError.message : "Unable to update check-in");
          });
      },
      () => setError("Location updates are unavailable; keep this tab open to check in."),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isHeadingThere, selectedSession?.id, token]);

  async function checkIn() {
    if (!token || !selectedSession || !latestPosition.current || !isWithinCheckinRadius) return;
    try {
      const position = latestPosition.current;
      const { attendanceStatus } = await sendSessionLocation(token, selectedSession.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyM: position.coords.accuracy,
      });
      setSelectedSession((current) => current ? { ...current, current_user_rsvp: attendanceStatus } : current);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to check in");
    }
  }

  async function openDirections(session: Session) {
    if (!token) return;
    try {
      const { anchor } = await fetchSessionDirections(token, session.id);
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${anchor.latitude},${anchor.longitude}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "RSVP before requesting directions");
    }
  }

  async function toggleRsvp() {
    if (!token || !selectedSession || isRsvpSubmitting) return;
    setIsRsvpSubmitting(true);
    setError(null);
    try {
      const response = await toggleSessionRsvp(token, selectedSession.id);
      const nextHeadingThere = response.rsvpStatus === "heading_there";
      setIsHeadingThere(nextHeadingThere);
      setSessions((current) => current.map((session) => {
        if (session.id !== selectedSession.id) return session;
        return {
          ...session,
          current_user_rsvp: response.rsvpStatus,
          heading_there_count: Math.max(
            0,
            (session.heading_there_count ?? 0) + (nextHeadingThere ? 1 : -1)
          ),
        };
      }));
      setSelectedSession((current) => current ? {
        ...current,
        current_user_rsvp: response.rsvpStatus,
        heading_there_count: Math.max(
          0,
          (current.heading_there_count ?? 0) + (nextHeadingThere ? 1 : -1)
        ),
      } : current);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update RSVP");
    } finally {
      setIsRsvpSubmitting(false);
    }
  }

  return (
    <section className="explore" aria-labelledby="explore-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Explore</p>
          <h2 id="explore-heading">Plans near you</h2>
        </div>
        <span className="location-state">{locationState}</span>
      </div>
      <div className="map-frame" aria-label="Nearby meetup map" ref={mapElement} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      {selectedSession && (
        <article className="session-detail" aria-label="Session details">
          <div className="detail-topline">
            <span className={`detail-status ${selectedSession.status}`}>
              {selectedSession.status === "live" ? "Live now" : "Starting soon"}
            </span>
            <button className="close-action" type="button" onClick={() => setSelectedSession(null)} aria-label="Close session details">
              ×
            </button>
          </div>
          <h3>{selectedSession.title}</h3>
          <p className="detail-meta">{selectedSession.activity_type} · {new Date(selectedSession.scheduled_at).toLocaleString()}</p>
          {selectedSession.description && <p className="detail-description">{selectedSession.description}</p>}
          <div className="detail-stats">
            <span><strong>{selectedSession.checked_in_count ?? 0}</strong> checked in</span>
            <span><strong>{selectedSession.heading_there_count ?? 0}</strong> heading there</span>
            <span><strong>{selectedSession.checkin_radius_m}m</strong> check-in radius</span>
          </div>
          <div className="detail-actions">
            <button className="primary-action" type="button" onClick={toggleRsvp} disabled={isRsvpSubmitting || isCheckedIn}>
              {isRsvpSubmitting ? "Updating..." : isCheckedIn ? "Checked in" : isHeadingThere ? "Heading there" : "I'm heading there"}
            </button>
            <button className="secondary-action" type="button" onClick={() => openDirections(selectedSession)}>
              Directions
            </button>
          </div>
          <button
                className="secondary-action checkin-action"
                type="button"
                disabled={!isWithinCheckinRadius || isCheckedIn}
                onClick={() => void checkIn()}
              >
                {isCheckedIn ? "Checked in" : isWithinCheckinRadius ? "Check in" : "Move within the event radius to check in"}
              </button>
          {isHeadingThere && (
            <p className="tracking-note">Location check-in is active while this tab stays open.</p>
          )}
        </article>
      )}
      <div className="nearby-list">
        {sessions.length === 0 ? (
          <p className="empty-state">Nothing live nearby yet. Host the first plan.</p>
        ) : (
          sessions.map((session) => (
            <button className="nearby-row" key={session.id} type="button" onClick={() => {
              setSelectedSession(session);
              setIsHeadingThere(isAttendanceActive(session));
              setIsWithinCheckinRadius(session.current_user_rsvp === "checked_in");
            }}>
              <span className={`status-dot ${session.status}`} aria-hidden="true" />
              <div>
                <h3>{session.title}</h3>
                <p>{session.activity_type} · {session.status} · {session.checked_in_count ?? 0} checked in</p>
              </div>
              <span className="nearby-arrow" aria-hidden="true">›</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}