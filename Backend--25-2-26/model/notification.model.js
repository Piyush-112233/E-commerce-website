import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["coupon", "order", "promo", "general"],
        default: "general"
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String   // e.g. "/shop"
    }
}, { timestamps: true });

const NotificationModel = mongoose.model("notification", notificationSchema);

export default NotificationModel;
