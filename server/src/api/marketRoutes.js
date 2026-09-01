const express = require('express');
const { SUPPORTED_INTERVALS } = require('../market/binanceRestClient');

function createMarketRouter({ marketClient, supportedPairs = [] }) {
  const router = express.Router();
  const pairSet = new Set(supportedPairs);

  router.get('/candles', async (request, response) => {
    const pair = String(request.query.pair || '').replace('/', '').trim().toUpperCase();
    const interval = String(request.query.interval || '1m').trim();
    const requestedLimit = Number.parseInt(request.query.limit, 10);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 30), 500)
      : 120;

    if (!pairSet.has(pair)) {
      return response.status(400).json({ error: 'Pair is not supported.' });
    }

    if (!SUPPORTED_INTERVALS.has(interval)) {
      return response.status(400).json({ error: 'Candle interval is not supported.' });
    }

    try {
      const candles = await marketClient.getCandles({ pair, interval, limit });
      response.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
      return response.json({ pair, interval, candles });
    } catch (error) {
      console.error('Market candle request failed:', error.message);
      return response.status(502).json({ error: 'Historical market data is temporarily unavailable.' });
    }
  });

  return router;
}

module.exports = { createMarketRouter };
