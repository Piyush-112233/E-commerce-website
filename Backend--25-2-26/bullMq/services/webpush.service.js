import webpush from "web-push";

// Set VAPID details once when the module is imported
webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a Web Push notification to a subscribed browser
 * @param {object} subscription - PushSubscription object stored in DB
 * @param {string} title        - Notification title
 * @param {string} body         - Notification body / message
 * @param {string} link         - URL to open on notification click
 */
const sendWebPush = async (subscription, title, body, link = "/") => {
    if (!subscription || !subscription.endpoint) {
        console.log("[WebPush] No subscription found — skipping push");
        return;
    }

    const payload = JSON.stringify({ title, body, link });

    try {
        await webpush.sendNotification(subscription, payload);
        console.log("[WebPush] Sent successfully ✅");
    } catch (error) {
        // 410 Gone = subscription expired/invalid → must clear from DB
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log("[WebPush] Subscription expired/invalid:", error.statusCode);
        } else {
            console.error("[WebPush] Send error:", error.message);
        }
        throw error; // re-throw so BullMQ worker can handle cleanup
    }
};

export default sendWebPush;
