const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const marketPairs = (process.env.MARKET_PAIRS || 'BTCUSDT,ETHUSDT,SOLUSDT')
  .split(',')
  .map((pair) => pair.trim().toUpperCase())
  .filter(Boolean);

const defaultBinanceStreamUrl =
  `wss://stream.binance.com:9443/stream?streams=${marketPairs
    .map((pair) => `${pair.toLowerCase()}@trade`)
    .join('/')}`;

module.exports = {
  port: Number(process.env.PORT || 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  marketPairs,
  binanceStreamUrl: process.env.BINANCE_STREAM_URL || defaultBinanceStreamUrl,
  websocketPath: process.env.WEBSOCKET_PATH || '/',
};
