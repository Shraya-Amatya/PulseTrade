const express = require('express');
const pool = require('../db/pool');
const { calculatePortfolioSummary } = require('../services/portfolioCalculator');

const DEFAULT_PORTFOLIO_ID = 1;
const DEFAULT_MAX_PRICE_AGE_MS = 5000;

function createPortfolioRouter({
  database = pool,
  priceCache = null,
  portfolioId = DEFAULT_PORTFOLIO_ID,
  maxPriceAgeMs = DEFAULT_MAX_PRICE_AGE_MS,
} = {}) {
  const router = express.Router();

  router.get('/', async (_request, response) => {
    try {
      const [portfolioResult, positionsResult] = await Promise.all([
        database.query(
          `SELECT id, cash_balance, created_at, updated_at
           FROM portfolio
           WHERE id = $1`,
          [portfolioId],
        ),
        database.query(
          `SELECT pair, quantity, average_entry_price
           FROM positions
           WHERE portfolio_id = $1 AND quantity > 0
           ORDER BY pair`,
          [portfolioId],
        ),
      ]);

      if (portfolioResult.rows.length === 0) {
        return response.status(404).json({ error: 'Portfolio not found' });
      }

      const portfolio = portfolioResult.rows[0];
      return response.json(calculatePortfolioSummary({
        cashBalance: portfolio.cash_balance,
        positions: positionsResult.rows,
        getPrice: priceCache?.getPrice.bind(priceCache),
        maxPriceAgeMs,
      }));
    } catch (error) {
      console.error('Portfolio query failed:', error.message);
      return response.status(500).json({ error: 'Unable to load portfolio' });
    }
  });

  return router;
}

module.exports = createPortfolioRouter();
module.exports.createPortfolioRouter = createPortfolioRouter;
