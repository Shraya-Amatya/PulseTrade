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

const evmPoolAddresses = (process.env.EVM_POOL_ADDRESSES || '')
  .split(',')
  .map((address) => address.trim())
  .filter(Boolean);

module.exports = {
  port: Number(process.env.PORT || 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  marketPairs,
  binanceStreamUrl: process.env.BINANCE_STREAM_URL || defaultBinanceStreamUrl,
  websocketPath: process.env.WEBSOCKET_PATH || '/',
  evmRpcUrl: process.env.EVM_RPC_URL || '',
  evmWsUrl: process.env.EVM_WS_URL || '',
  evmPoolAddresses,
  apiRateLimitWindowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60000),
  apiRateLimitMax: Number(process.env.API_RATE_LIMIT_MAX || 120),
};
