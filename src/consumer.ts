import { Worker, Job } from 'bullmq';
import path from 'path';
import fs from 'fs';
import ytdl from 'ytdl-core';
import IORedis from 'ioredis';
import config from './config';

console.log('Worker started!');

const downloaderWorker = new Worker('download', async (job: Job) => {
  try {
    const { url, format, quality } = job.data;
    console.log(job.id + ' started!');

    const parsedUrl = url!.toString();
    const isValidUrl = ytdl.validateURL(parsedUrl);
    if (!isValidUrl) {
      throw new Error('Invalid URL');
    }

    const info = await ytdl.getInfo(parsedUrl);
    const videoId = ytdl.getVideoID(parsedUrl);
    const title = info.videoDetails.title;
    const videoFormat = ytdl.chooseFormat(info.formats, { quality: quality });

    const video = ytdl(parsedUrl, { format: videoFormat });
    const filePath = path.join(__dirname, '../', 'downloads', `${title}.${format}`);
    const file = fs.createWriteStream(filePath);
    video.on('progress', (_, downloaded, total) => {
      const percent = downloaded / total;
      job.updateProgress({ roomId: videoId, progress: percent * 100 });
    });
    video.pipe(file);
    // progress

    return { file: filePath, roomId: videoId };
  } catch (error) {
    console.log(error);
  }
});
