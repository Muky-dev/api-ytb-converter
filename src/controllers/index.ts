import { Router } from 'express';
import ytdl from 'ytdl-core';
import { createClient } from 'redis';
import { Queue } from 'bullmq';

const router = Router();
// setup controller

router.get('/video-info', async (req, res) => {
  try {
    const { url, mediaType } = req.query;

    const redisUrl =
      process.env.NODE_ENV === 'production'
        ? `redis://${process.env.REDIS_USER}:${process.env.REDIS_PASS}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}}`
        : `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

    // Redis
    const redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on('error', (error) => {
      console.log(error);
    });

    await redisClient.connect();

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!mediaType) {
      return res.status(400).json({ error: 'Media type is required' });
    }

    // Validate media type
    if (mediaType !== 'audioonly' && mediaType !== 'videoandaudio') {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    const parsedUrl = url!.toString();

    const cached = await redisClient.get(`${parsedUrl}-${mediaType}`);

    if (cached) {
      //return res.status(200).json(JSON.parse(cached));
    }

    const isValidUrl = ytdl.validateURL(parsedUrl);

    if (!isValidUrl) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const videoInfo = await ytdl.getInfo(parsedUrl);
    const videoTitle = videoInfo.videoDetails.title;
    const videoThumbnail = videoInfo.videoDetails.thumbnails[0].url;

    const videoFormats = ytdl.filterFormats(videoInfo.formats, mediaType);

    const response = { title: videoTitle, thumbnail: videoThumbnail, formats: videoFormats };

    await redisClient.set(`${parsedUrl}-${mediaType}`, JSON.stringify(response), { EX: 10 });
    await redisClient.disconnect();

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error });
  }
});

export default router;
