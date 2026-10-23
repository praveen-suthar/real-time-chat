import { Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { AuthenticatedRequest } from '../middlewares/auth';
import path from 'path';
import fs from 'fs';

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadMedia(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (!isImage && !isVideo) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(400).json({ error: 'Only image and video files are supported' });
      return;
    }

    const mediaType = isVideo ? 'video' : 'image';

    if (isCloudinaryConfigured) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'chatapp',
        type: 'authenticated',
        resource_type: isVideo ? 'video' : 'image',
      });

      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      res.status(200).json({
        url: `cloudinary://${result.public_id}`,
        mediaType,
      });
      return;
    }

    const filename = path.basename(file.path);

    res.status(200).json({
      url: `uploads/${filename}`,
      mediaType,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload media file' });
  }
}
