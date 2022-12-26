import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

import rateLimit from 'express-rate-limit';

import router from './routes';
import SocketService from './services/socket';

//dotenv
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

// setup express
const app = express();
const server = createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(limiter);
app.use(cors());

// cors

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// setup socket
app.set('socket', SocketService.Initialize(server));

// Router
app.use(router);

// start server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
