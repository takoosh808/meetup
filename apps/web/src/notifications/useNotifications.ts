import { useCallback, useEffect, useState } from "react";
import {
  fetchNotificationConfig,
  removePushSubscription,
  savePushSubscription,
} from "../auth/api";

const NOTIFICATIONS_ENABLED_KEY = "meetup.notifications.enabled";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function useNotifications(token?: string | null) {
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
    if (nextEnabled && token && "serviceWorker" in navigator && "PushManager" in window) {
      const config = await fetchNotificationConfig(token);
      if (config.publicKey) {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(config.publicKey),
        });
        await savePushSubscription(token, subscription);
      }
    }
    setEnabled(nextEnabled);
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(nextEnabled));
    return nextEnabled;
  }, [permission, supported, token]);

  const disable = useCallback(async () => {
    if (token && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(token, subscription.endpoint);
        await subscription.unsubscribe();
      }
    }
    setEnabled(false);
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
  }, [token]);

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    if (enabled && permission === "granted") new Notification(title, options);
  }, [enabled, permission]);

  return { enabled, permission, supported, enable, disable, notify };
}