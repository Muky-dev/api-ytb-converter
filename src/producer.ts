import ytdl from 'ytdl-core';
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import config from './config';

import { IVideoRequest } from './interfaces';
import SocketService from './services/socket';

interface WorkerResponse {
  url: string;
  roomId: string;
}

const ValidateAndQueueConvert = async (data: IVideoRequest) => {
  console.log('Validating and queuing convert');
  const { url, format, quality } = data;
  const parsedUrl = url!.toString();
  const isValidUrl = ytdl.validateURL(parsedUrl);

  if (!isValidUrl) {
    throw new Error('Invalid URL');
  }

  const DownloaderQueue = new Queue('convert');
  const job = await DownloaderQueue.add('convert', { url, format, quality });
  return job;
};

const eventQueue = new QueueEvents('convert');

eventQueue.on('progress', ({ jobId, data }) => {
  const { roomId, progress } = data as unknown as { roomId: string; progress: number };
  console.log(jobId + ' progress: ' + progress + '%');
  SocketService.GetInstance()?.to(roomId).emit('progress', progress);
});

eventQueue.on('completed', ({ jobId, returnvalue }) => {
  console.log(jobId + ' completed!');
  const { url, roomId } = returnvalue as unknown as WorkerResponse;
  SocketService.GetInstance()?.to(roomId).emit('ready-to-download', url);
});

export { ValidateAndQueueConvert };
