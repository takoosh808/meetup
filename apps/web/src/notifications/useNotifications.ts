import { useCallback, useEffect, useState } from "react";

const NOTIFICATIONS_ENABLED_KEY = "meetup.notifications.enabled";

export function useNotifications() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    supported ? Notification.permission : "unsupported"
  );
  const [enabled, setEnabled] = useState(() =>
    localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true"
  );

  useEffect(() => {
    if (supported) setPermission(Notification.permission);
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) return false;
    const nextPermission = permission === "granted"
      ? permission
      : await Notification.requestPermission();
    setPermission(nextPermission);
    const nextEnabled = nextPermission === "granted";
    setEnabled(nextEnabled);
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(nextEnabled));
    return nextEnabled;
  }, [permission, supported]);

  const disable = useCallback(() => {
    setEnabled(false);
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
  }, []);

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    if (enabled && permission === "granted") new Notification(title, options);
  }, [enabled, permission]);

  return { enabled, permission, supported, enable, disable, notify };
}