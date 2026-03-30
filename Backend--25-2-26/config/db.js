import mongoose from "mongoose"

const connectDb = async () => {
    const mongoUrl = process.env.MONGODB_URL;

    if (!mongoUrl) {
        throw new Error("MONGODB_URL is not set in the environment");
    }

    try {
        await mongoose.connect(mongoUrl);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
}

export default connectDb;
