import mongoose from "mongoose"

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        unique: true,
        index: true
    },
    items: [cartItemSchema],
    totalQuantity: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        default: 0
    },
    totalDiscount: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });


// Calculate total before saving
cartSchema.pre("save", async function () {
    this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
    this.totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.totalDiscount = this.items.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
    this.lastUpdated = new Date();
});

const cartModel = mongoose.model("cart", cartSchema);

export default cartModel;
