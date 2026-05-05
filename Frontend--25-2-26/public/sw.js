// ============================================================
// Service Worker for Web Push Notifications
// File must be in: Frontend/public/sw.js
// Runs in the background even when the tab is closed
// ============================================================

// Fires when a push message is received from the server
self.addEventListener("push", (event) => {
    if (!event.data) return;

    // Parse JSON payload sent from backend webpush.service.js
    const data = event.data.json();
    const { title, body, link } = data;

    const options = {
        body: body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: { link },               // stored so notificationclick can read it
        vibrate: [200, 100, 200],
        requireInteraction: true,     // stays visible until user interacts
        actions: [
            { action: "open",  title: "View" },
            { action: "close", title: "Dismiss" }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Fires when user clicks the push notification
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    // Dismiss action — just close
    if (event.action === "close") return;

    const link = event.notification.data?.link || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            // If the app tab is already open → focus it and navigate
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    client.focus();
                    client.navigate(link);
                    return;
                }
            }
            // No open tab → open a new one
            if (clients.openWindow) {
                return clients.openWindow(link);
            }
        })
    );
});
