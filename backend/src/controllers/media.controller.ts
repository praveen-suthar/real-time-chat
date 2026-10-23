import { Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logger } from '../lib/logger';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';

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

export async function getMessageMedia(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Session token required' });
      return;
    }

    if (!messageId) {
      res.status(400).json({ error: 'Message ID is required' });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!message || !message.mediaUrl) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === userId
    );

    if (!isParticipant) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    let mediaUrl = message.mediaUrl;

    if (
      mediaUrl.startsWith('/api/media/') ||
      (!mediaUrl.startsWith('http') && !mediaUrl.startsWith('cloudinary://') && message.forwardedFromId)
    ) {
      const sourceId = mediaUrl.startsWith('/api/media/')
        ? mediaUrl.replace('/api/media/', '')
        : message.forwardedFromId;

      if (sourceId) {
        const sourceMessage = await prisma.message.findUnique({
          where: { id: sourceId },
          select: { mediaUrl: true },
        });
        if (sourceMessage?.mediaUrl) {
          mediaUrl = sourceMessage.mediaUrl;
        }
      }
    }

    const isVideo =
      message.mediaType === 'video' ||
      mediaUrl.match(/\.(mp4|webm|mov|ogg)$/i) !== null;

    if (
      isCloudinaryConfigured &&
      (mediaUrl.startsWith('cloudinary://') || (!mediaUrl.startsWith('http') && !fs.existsSync(mediaUrl)))
    ) {
      const publicId = mediaUrl.replace('cloudinary://', '');
      const signedUrl = cloudinary.url(publicId, {
        resource_type: isVideo ? 'video' : 'image',
        type: 'authenticated',
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 300,
      });

      https
        .get(signedUrl, (remoteRes) => {
          if (remoteRes.statusCode && remoteRes.statusCode >= 400) {
            res.status(remoteRes.statusCode).json({ error: 'Failed to stream media asset' });
            return;
          }
          res.setHeader(
            'Content-Type',
            remoteRes.headers['content-type'] || (isVideo ? 'video/mp4' : 'image/jpeg')
          );
          res.setHeader('Cache-Control', 'private, max-age=86400');
          remoteRes.pipe(res);
        })
        .on('error', (err) => {
          logger.error('Error streaming from Cloudinary:', err);
          res.status(500).json({ error: 'Failed to retrieve media' });
        });
      return;
    }

    if (mediaUrl.startsWith('http')) {
      const client = mediaUrl.startsWith('https') ? https : http;
      client
        .get(mediaUrl, (remoteRes) => {
          if (remoteRes.statusCode && remoteRes.statusCode >= 400) {
            res.status(remoteRes.statusCode).json({ error: 'Failed to stream media asset' });
            return;
          }
          res.setHeader(
            'Content-Type',
            remoteRes.headers['content-type'] || (isVideo ? 'video/mp4' : 'image/jpeg')
          );
          res.setHeader('Cache-Control', 'private, max-age=86400');
          remoteRes.pipe(res);
        })
        .on('error', (err) => {
          logger.error('Error streaming remote media:', err);
          res.status(500).json({ error: 'Failed to retrieve media' });
        });
      return;
    }

    let localPath = mediaUrl;
    if (!path.isAbsolute(localPath)) {
      localPath = path.join(__dirname, '../../', mediaUrl);
    }

    if (!fs.existsSync(localPath)) {
      res.status(404).json({ error: 'Media file not found on disk' });
      return;
    }

    const stat = fs.statSync(localPath);
    const fileSize = stat.size;
    const contentType = isVideo ? 'video/mp4' : (message.mediaType || 'image/jpeg');

    const range = req.headers.range;
    if (range && isVideo) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(localPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      };
      res.writeHead(206, head);
      file.pipe(res);
      return;
    }

    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    fs.createReadStream(localPath).pipe(res);
  } catch (error) {
    logger.error('getMessageMedia error:', error);
    res.status(500).json({ error: 'Internal server error while fetching media' });
  }
}
