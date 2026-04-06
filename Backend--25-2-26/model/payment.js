import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "order"
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    razorpayOrderId: {
        type: String,
        required: true
    },
    razorpayPaymentId: {
        type: String,
        required: true
    },
    razorpaySignatureId: {
        type: String
    },
    amount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Captured', 'Authorized', 'Failed', 'Pending'],
        default: 'Pending'
    },
    signatureVerified: {
        type: Boolean,
        default: false
    },
    paymentMethod: {
        type: String
    },
    failureReason: {
        type: String
    }
}, { timestamps: true });

const paymentModel = mongoose.model("payment", paymentSchema);
export default paymentModel;
