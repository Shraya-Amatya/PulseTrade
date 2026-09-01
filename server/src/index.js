const http = require('node:http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const pool = require('./db/pool');
const { createPortfolioRouter } = require('./api/portfolioRoutes');
const { createTradesRouter } = require('./api/tradesRoutes');
const MarketHub = require('./market/marketHub');
const { TradingEngine } = require('./services/tradingEngine');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

const server = http.createServer(app);
const marketHub = new MarketHub({ server });
const tradingEngine = new TradingEngine({
  pool,
  priceCache: marketHub.priceCache,
  supportedPairs: config.marketPairs,
});
const portfolioRouter = createPortfolioRouter({
  database: pool,
  priceCache: marketHub.priceCache,
});
const tradesRouter = createTradesRouter({ database: pool, tradingEngine });

app.use('/api/portfolio', portfolioRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/trade', tradesRouter);

server.listen(config.port, () => {
  console.log(`PulseTrade server listening on http://localhost:${config.port}`);
  console.log(`Market WebSocket available at ws://localhost:${config.port}${config.websocketPath}`);
  if (config.evmRpcUrl || config.evmWsUrl) console.log('Sepolia blockchain event stream enabled.');
  marketHub.start();
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down PulseTrade server.`);
  marketHub.stop();
  await pool.end();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
