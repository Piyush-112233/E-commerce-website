import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    cartItems: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "product",
            required: true
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    totalDiscount: {
        type: Number,
        default: 0
    },
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Cancelled', 'Failed'],
        default: 'Pending'
    },
    expireAt: {
        type: Date,
        required: function () {
            return this.status === 'Pending';
        }
    }
}, { timestamps: true });

// auto delete pending orders after 30 mins
orderSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const orderModel = mongoose.model("order", orderSchema);
export default orderModel;
