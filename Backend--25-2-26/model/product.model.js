import mongoose, { Schema } from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
    price: {
        type: Number
    },
    discount: {
        type: Number
    },
    imageUrl: {
        type: String
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category"
    }
}, { timestamps: true });

const ProductModel = mongoose.model("product", productSchema);

export default ProductModel;