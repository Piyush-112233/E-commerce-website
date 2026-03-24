import mongoose from "mongoose";

const catrgorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true,
    }
}, { timestamps: true });

const CategoryModel = mongoose.model('category', catrgorySchema)

export default CategoryModel;