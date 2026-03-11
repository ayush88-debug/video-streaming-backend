import dotenv from 'dotenv'
dotenv.config()
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        const stats = fs.statSync(localFilePath);
        const fileSizeInBytes = stats.size;
        const maxSize = 100 * 1024 * 1024; // 100MB

        if (fileSizeInBytes > maxSize) {
            throw new Error("File is too large to upload. Limit is 100mb")
        }

        //Upload file
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : 'auto'
        })

        // remove the locally saved temporary file
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        
        return response
    } catch (error) {
        // remove the locally saved temporary file as upload got failed
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        throw error;
    }
}

const deleteFromCloudinary = async (fileURL) => {
    try {
        if(!fileURL) return;

        const publicID = fileURL.split('/').slice(-1)[0].split('.')[0]

        await cloudinary.uploader.destroy(publicID)

    } catch (error) {
        console.error("Error while deleteing the file", error)
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}