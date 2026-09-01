const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

const toNumber = (value) => Number(value);

router.get('/', async (_request, response) => {
  try {
    const [portfolioResult, positionsResult] = await Promise.all([
      pool.query(
      `SELECT id, cash_balance, created_at, updated_at
       FROM portfolio
       WHERE id = $1`,
      [1],
      ),
      pool.query(
        `SELECT pair, quantity, average_entry_price
         FROM positions
         WHERE portfolio_id = $1 AND quantity > 0
         ORDER BY pair`,
        [1],
      ),
    ]);

    if (portfolioResult.rows.length === 0) {
      return response.status(404).json({ error: 'Portfolio not found' });
    }

    const portfolio = portfolioResult.rows[0];
    const positions = positionsResult.rows.map((position) => ({
      pair: position.pair,
      quantity: toNumber(position.quantity),
      averageEntryPrice: toNumber(position.average_entry_price),
    }));

    return response.json({
      cashBalance: toNumber(portfolio.cash_balance),
      totalValue: toNumber(portfolio.cash_balance),
      unrealizedPnl: 0,
      positions,
    });
  } catch (error) {
    console.error('Portfolio query failed:', error.message);
    return response.status(500).json({ error: 'Unable to load portfolio' });
  }
});

module.exports = router;
