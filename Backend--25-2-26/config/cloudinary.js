import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config(
    {
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    }
);


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        // Upload the file on cloudinary
        const uploadResult = await cloudinary.uploader.upload(localFilePath,
            { resource_type: "auto" }
        )

        // file has been uploaded succesfully
        fs.unlinkSync(localFilePath)
        console.log("file is uploader on cloudinary", uploadResult.url);
        return uploadResult;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        try {
            fs.unlinkSync(localFilePath);
        } catch (unlinkError) {
            console.error("Failed to delete local file:", unlinkError);
        }                    // remove the locally saved temporary file as upload operation failed
        return null
    }
}

export default uploadOnCloudinary;