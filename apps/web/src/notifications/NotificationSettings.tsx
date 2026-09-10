import { useNotifications } from "./useNotifications";
import { useAuth } from "../auth/AuthContext";

export function NotificationSettings() {
  const { token } = useAuth();
  const { enabled, permission, supported, enable, disable } = useNotifications(token);

  if (!supported) {
    return <p className="notification-help">Browser notifications are unavailable here.</p>;
  }

  return (
    <section className="notification-settings" aria-label="Notification settings">
      <div>
        <p className="location-label">Live session alerts</p>
        <p className="notification-help">
          {permission === "denied"
            ? "Notifications are blocked in your browser."
            : "Get an alert when a session you are watching goes live."}
        </p>
      </div>
      {enabled ? (
        <button className="secondary-action" type="button" onClick={disable}>Turn off</button>
      ) : (
        <button className="secondary-action" type="button" onClick={() => void enable()} disabled={permission === "denied"}>
          Turn on
        </button>
      )}
    </section>
  );
}