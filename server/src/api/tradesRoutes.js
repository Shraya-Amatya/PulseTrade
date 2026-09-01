const express = require('express');
const pool = require('../db/pool');
const { TradingError, TradingEngine } = require('../services/tradingEngine');

const toNumber = (value) => Number(value);

function createTradesRouter({
  database = pool,
  tradingEngine = null,
} = {}) {
  const router = express.Router();

  router.get('/', async (request, response) => {
    const requestedLimit = Number.parseInt(request.query.limit, 10);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;

    try {
      const result = await database.query(
        `SELECT id, pair, side, quantity, execution_price, notional_value, created_at
         FROM trades
         WHERE portfolio_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2`,
        [1, limit],
      );

      return response.json({
        trades: result.rows.map((trade) => ({
          id: trade.id,
          pair: trade.pair,
          side: trade.side,
          quantity: toNumber(trade.quantity),
          executionPrice: toNumber(trade.execution_price),
          notionalValue: toNumber(trade.notional_value),
          createdAt: trade.created_at,
        })),
      });
    } catch (error) {
      console.error('Trades query failed:', error.message);
      return response.status(500).json({ error: 'Unable to load trades' });
    }
  });

  router.post('/', async (request, response) => {
    if (!tradingEngine) {
      return response.status(501).json({ error: 'Trading engine is not configured.' });
    }

    try {
      const result = await tradingEngine.executeTrade(request.body);
      return response.status(201).json(result);
    } catch (error) {
      if (error instanceof TradingError) {
        return response.status(error.status).json({
          code: error.code,
          error: error.message,
        });
      }

      console.error('Trade execution failed:', error.message);
      return response.status(500).json({ error: 'Unable to execute trade' });
    }
  });

  return router;
}

module.exports = createTradesRouter();
module.exports.createTradesRouter = createTradesRouter;
