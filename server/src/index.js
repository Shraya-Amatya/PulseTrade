const http = require('node:http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const portfolioRoutes = require('./api/portfolioRoutes');
const tradesRoutes = require('./api/tradesRoutes');
const MarketHub = require('./market/marketHub');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trades', tradesRoutes);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

const server = http.createServer(app);
const marketHub = new MarketHub({ server });

server.listen(config.port, () => {
  console.log(`PulseTrade server listening on http://localhost:${config.port}`);
  console.log(`Market WebSocket available at ws://localhost:${config.port}${config.websocketPath}`);
  marketHub.start();
});
