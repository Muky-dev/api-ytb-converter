import { Server } from 'socket.io';
import ytdl from 'ytdl-core';

import { ValidateAndQueueConvert } from '../producer';

let instance: Server | null = null;

class SocketService {
  static Initialize(server) {
    instance = new Server(server, {
      cors: {
        origin: 'http://localhost:3000',
        allowedHeaders: ['Access-Control-Allow-Credentials'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      cookie: true,
    });

    instance.on('connection', (socket) => {
      console.log(socket.id + ' connected');
      socket.on('convert', async (data) => {
        try {
          if (!data.url) throw new Error('Invalid URL');
          const videoId = ytdl.getVideoID(data.url);
          await socket.join(videoId);
          await ValidateAndQueueConvert(data);
        } catch (error) {
          console.log(error);
          socket.emit('error', error);
        }
      });
    });

    return instance;
  }

  static GetInstance() {
    return instance;
  }
}

export default SocketService;
