import NotificationModel from "../model/notification.model.js";
import notificationQueue from "../bullMq/queue.js/notification.queue.js";
import UserModel from "../model/user.model.js";

// ─────────────────────────────────────────────────────────────────
// GET VAPID PUBLIC KEY
// GET /api/notifications/vapid-public-key
// Frontend needs this to create a push subscription
// ─────────────────────────────────────────────────────────────────
export const getVapidPublicKey = (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// ─────────────────────────────────────────────────────────────────
// SAVE PUSH SUBSCRIPTION
// POST /api/notifications/subscribe
// Called once after the user grants notification permission
// ─────────────────────────────────────────────────────────────────
export const savePushSubscription = async (req, res) => {
    try {
        const userId = req.user._id;
        const { subscription } = req.body;
        // subscription = { endpoint, expirationTime, keys: { p256dh, auth } }

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ success: false, message: "Invalid subscription object" });
        }

        await UserModel.findByIdAndUpdate(userId, { pushSubscription: subscription });
        res.status(200).json({ success: true, message: "Push subscription saved" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────
// ADMIN: SEND NOTIFICATION
// POST /api/notifications/send
// ─────────────────────────────────────────────────────────────────
export const sendNotification = async (req, res) => {
    try {
        const { userId, title, message, type, link } = req.body;

        if (!userId || !title || !message) {
            return res.status(400).json({ success: false, message: "userId, title and message are required" });
        }

        // 1. Save notification to DB (this is what the bell icon reads)
        const notification = await NotificationModel.create({
            userId,
            title,
            message,
            type: type || "general",
            link
        });

        // 2. Real-time update via Socket.IO (if user is currently ONLINE)
        if (global.io) {
            global.io.to(`user:${userId}`).emit("notification:new", {
                _id: notification._id,
                title,
                message,
                type: type || "general",
                link,
                isRead: false,
                createdAt: notification.createdAt
            });
        }

        // 3. Add to BullMQ queue → worker sends Web Push (works when OFFLINE too)
        await notificationQueue.add("PushNotification", {
            userId,
            title,
            message,
            link
        });

        res.status(201).json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────
// USER: GET MY NOTIFICATIONS
// GET /api/notifications
// ─────────────────────────────────────────────────────────────────
export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        const notifications = await NotificationModel.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await NotificationModel.countDocuments({ userId, isRead: false });

        res.status(200).json({ success: true, notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────
// USER: MARK SINGLE NOTIFICATION AS READ
// PATCH /api/notifications/read/:id
// ─────────────────────────────────────────────────────────────────
export const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        await NotificationModel.updateOne(
            { _id: req.params.id, userId },
            { $set: { isRead: true } }
        );
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────
// USER: MARK ALL NOTIFICATIONS AS READ
// PATCH /api/notifications/read-all
// ─────────────────────────────────────────────────────────────────
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        await NotificationModel.updateMany(
            { userId, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
