import { v2 as Cloudinary } from "cloudinary";
import config from "../config";

Cloudinary.config({
    cloud_name: config.cloudinary_cloud_name,
    api_key : config.cloudinary_api_key,
    api_secret: config.cloudinary_api_secret
})

export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folderName: string
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: 'auto' },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const cloudinary = Cloudinary