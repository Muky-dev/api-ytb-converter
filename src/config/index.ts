if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const config = {
  redis: {
    host: process.env.REDIS_HOST || '',
    port: Number(process.env.REDIS_PORT) || 6379,
  },
};

export default config;
