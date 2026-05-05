import { Worker } from "bullmq";
import connection from "../queue.js/redis.connection.js";
import sendWebPush from "../services/webpush.service.js";
import UserModel from "../../model/user.model.js";

const notificationWorker = new Worker(
    "notificationQueue",
    async (job) => {
        if (job.name === "PushNotification") {
            const { userId, title, message, link } = job.data;

            // Get user's push subscription from DB
            const user = await UserModel.findById(userId).select("pushSubscription");
            if (!user || !user.pushSubscription) {
                console.log(`[Worker] User ${userId} has no push subscription — skipping`);
                return;
            }

            // Send Web Push (works even when user is offline)
            try {
                await sendWebPush(user.pushSubscription, title, message, link || "/");
            } catch (error) {
                // Subscription expired → clear it from DB so we don't keep retrying
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await UserModel.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
                    console.log(`[Worker] Cleared expired subscription for user ${userId}`);
                }
            }
        }
    },
    { connection }
);

notificationWorker.on("completed", (job) => {
    console.log(`[Worker] Notification job ${job.id} completed ✅`);
});

notificationWorker.on("failed", (job, err) => {
    console.error(`[Worker] Notification job ${job.id} failed:`, err.message);
});

export default notificationWorker;
