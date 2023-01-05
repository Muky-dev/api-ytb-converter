import { Router } from 'express';
import ytdl from 'ytdl-core';
import { createClient } from 'redis';

const router = Router();
// setup controller

router.get('/info', async (req, res) => {
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
    if (mediaType !== 'audioonly' && mediaType !== 'videoonly') {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    const parsedUrl = url!.toString();

    const cached = await redisClient.get(`${parsedUrl}-${mediaType}`);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const isValidUrl = ytdl.validateURL(parsedUrl);

    if (!isValidUrl) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const videoInfo = await ytdl.getInfo(parsedUrl);
    const videoTitle = videoInfo.videoDetails.title;
    const videoThumbnail = videoInfo.videoDetails.thumbnails.at(-1)?.url;

    // Get highest bitrate from video formats
    const videoFormats = [
      ...ytdl
        .filterFormats(videoInfo.formats, mediaType)
        .filter((format) =>
          mediaType === 'videoonly' ? format.container === 'mp4' : format.container === 'webm',
        )
        .reduce(
          (acc, format) =>
            format.container === 'mp4' &&
            (!acc.has(format.quality) || acc.get(format.quality).bitrate < format.bitrate!)
              ? acc.set(format.quality, format)
              : acc,
          new Map(),
        )
        .values(),
    ];

    const response = { title: videoTitle, thumbnail: videoThumbnail, formats: videoFormats };

    await redisClient.set(`${parsedUrl}-${mediaType}`, JSON.stringify(response), { EX: 10 });
    console.log('Caching response...');
    await redisClient.disconnect();

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error });
  }
});

export default router;
