import { Worker, Job } from 'bullmq';
import path from 'path';
import fs from 'fs';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';

console.log('Worker started!');

const downloaderWorker = new Worker('convert', async (job: Job) => {
  try {
    const { url, format, quality } = job.data;
    console.log('format: ' + format);
    console.log('quality: ' + quality);
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

    // Video Stream

    const filePath = path.join(__dirname, '../', 'downloads', `${title}[${quality}].${format}`);
    const file = fs.createWriteStream(filePath);

    await new Promise((resolve) => {
      const stream = ytdl(parsedUrl, { format: videoFormat })
        .pipe(file)
        .on('progress', async (_, downloaded, total) => {
          console.log('progress: ' + Math.round((downloaded / total) * 100) + '%');
          const progress = Math.round((downloaded / total) * 100);
          await job.updateProgress({ roomId: videoId, progress });
        })

        .on('finish', () => {
          console.log('finished downloading!');
          resolve(stream);
        });
    });

    console.log('finished!');

    return { url: filePath, roomId: videoId };
  } catch (error) {
    console.log(error);
  }
});

downloaderWorker.on('completed', async (job) => {
  console.log(job.id + ' completed!');
});
