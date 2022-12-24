import ytdl from 'ytdl-core';
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import config from './config';

import { IVideoRequest } from './interfaces';
import SocketService from './services/socket';

interface WorkerResponse {
  file: string;
  roomId: string;
}

const ValidateAndQueueDownload = async (data: IVideoRequest) => {
  console.log('Validating and queuing download');
  const { url, format, quality } = data;
  const parsedUrl = url!.toString();
  const isValidUrl = ytdl.validateURL(parsedUrl);
  const videoId = ytdl.getVideoID(parsedUrl);
  if (!isValidUrl) {
    throw new Error('Invalid URL');
  }

  const DownloaderQueue = new Queue('download');
  const job = await DownloaderQueue.add('download', { url, format, quality });
  return job;
};

const eventQueue = new QueueEvents('download');

eventQueue.on('completed', ({ jobId, returnvalue }) => {
  console.log(jobId + ' completed!');
  const { file, roomId } = returnvalue as unknown as WorkerResponse;
  SocketService.GetInstance()?.to(roomId).emit('ready-to-download', file);
});

eventQueue.on('progress', ({ jobId, data }) => {
  const { roomId, progress } = data as unknown as { roomId: string; progress: number };
  console.log(jobId + ' progress: ' + progress + '%');
  SocketService.GetInstance()?.to(roomId).emit('progress', progress);
});

export { ValidateAndQueueDownload };
