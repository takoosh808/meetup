import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../auth/AuthContext";
import { fetchNearbySessions, type Session } from "../auth/api";

const defaultCenter: [number, number] = [34.0195, -118.4912];

export function ExploreView() {
  const { token } = useAuth();
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [locationState, setLocationState] = useState("Showing nearby events");
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isHeadingThere, setIsHeadingThere] = useState(false);

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
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  }, [token]);

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
        setIsHeadingThere(false);
      });
      markers.current?.addLayer(marker);
    });
    L.circle(center, { radius: 150, color: "#49dda9", weight: 1, fillOpacity: 0.06 }).addTo(markers.current);
  }, [center, sessions]);

  function openDirections(session: Session) {
    if (session.map_latitude === undefined || session.map_longitude === undefined) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${session.map_latitude},${session.map_longitude}`,
      "_blank",
      "noopener,noreferrer"
    );
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
            <span><strong>0</strong> checked in</span>
            <span><strong>{selectedSession.broadcast_radius_m}m</strong> area</span>
          </div>
          <div className="detail-actions">
            <button className="primary-action" type="button" onClick={() => setIsHeadingThere((current) => !current)}>
              {isHeadingThere ? "You're heading there" : "I'm heading there"}
            </button>
            <button className="secondary-action" type="button" onClick={() => openDirections(selectedSession)}>
              Directions
            </button>
          </div>
        </article>
      )}
      <div className="nearby-list">
        {sessions.length === 0 ? (
          <p className="empty-state">Nothing live nearby yet. Host the first plan.</p>
        ) : (
          sessions.map((session) => (
            <button className="nearby-row" key={session.id} type="button" onClick={() => {
              setSelectedSession(session);
              setIsHeadingThere(false);
            }}>
              <span className={`status-dot ${session.status}`} aria-hidden="true" />
              <div>
                <h3>{session.title}</h3>
                <p>{session.activity_type} · {session.status}</p>
              </div>
              <span className="nearby-arrow" aria-hidden="true">›</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}