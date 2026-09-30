self.addEventListener("push", (event) => {
  const fallback = { title: "Meetup", body: "A session is happening nearby." };
  const data = event.data ? event.data.json() : fallback;
  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: data.body || fallback.body,
      tag: data.sessionId ? `meetup-session-${data.sessionId}` : "meetup-session",
      icon: "/meetup-icon.svg",
      data: { sessionId: data.sessionId },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});