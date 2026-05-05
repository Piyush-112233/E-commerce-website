import express from "express";
import {
    getVapidPublicKey,
    savePushSubscription,
    sendNotification,
    getMyNotifications,
    markAsRead,
    markAllAsRead
} from "../controllers/notification.controller.js";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";

const notificationRouter = express.Router();

// ✅ Public — frontend fetches this to build the push subscription
notificationRouter.get("/vapid-public-key", getVapidPublicKey);

// ✅ Logged-in users only — save their browser push subscription
notificationRouter.post("/subscribe", isAuthVerifyJwt, savePushSubscription);

// ✅ Admin only — send a notification to a user
notificationRouter.post("/send", isAuthVerifyJwt, authorizeRoles("admin"), sendNotification);

// ✅ Logged-in users — fetch their notifications + unread count
notificationRouter.get("/", isAuthVerifyJwt, getMyNotifications);

// ✅ Mark single notification as read
notificationRouter.patch("/read/:id", isAuthVerifyJwt, markAsRead);

// ✅ Mark all as read
notificationRouter.patch("/read-all", isAuthVerifyJwt, markAllAsRead);

export default notificationRouter;
