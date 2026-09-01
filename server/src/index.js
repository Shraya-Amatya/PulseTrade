const http = require('node:http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const pool = require('./db/pool');
const portfolioRoutes = require('./api/portfolioRoutes');
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
const tradesRouter = createTradesRouter({ database: pool, tradingEngine });

app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trades', tradesRouter);
app.use('/api/trade', tradesRouter);

server.listen(config.port, () => {
  console.log(`PulseTrade server listening on http://localhost:${config.port}`);
  console.log(`Market WebSocket available at ws://localhost:${config.port}${config.websocketPath}`);
  marketHub.start();
});
