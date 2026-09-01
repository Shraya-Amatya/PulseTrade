const DEFAULT_PORTFOLIO_ID = 1;
const DEFAULT_MAX_PRICE_AGE_MS = 5000;

class TradingError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'TradingError';
    this.code = code;
    this.status = status;
  }
}

function normalizePair(value) {
  if (typeof value !== 'string') return null;
  return value.replace('/', '').trim().toUpperCase();
}

function normalizeQuantity(value) {
  if (value === null || value === undefined || value === '') return null;

  const rawValue = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(rawValue)) return null;

  const [, decimalPart = ''] = rawValue.split('.');
  if (decimalPart.length > 12) return null;

  const quantity = Number(rawValue);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  return rawValue;
}

function normalizeTradeRequest(body, supportedPairs) {
  const pair = normalizePair(body?.pair);
  const side = typeof body?.side === 'string' ? body.side.trim().toUpperCase() : null;
  const quantity = normalizeQuantity(body?.quantity);

  if (!pair || !supportedPairs.has(pair)) {
    throw new TradingError('UNSUPPORTED_PAIR', 'Pair is not supported.');
  }

  if (side !== 'BUY' && side !== 'SELL') {
    throw new TradingError('INVALID_SIDE', 'Side must be BUY or SELL.');
  }

  if (!quantity) {
    throw new TradingError(
      'INVALID_QUANTITY',
      'Quantity must be a positive number with at most 12 decimal places.',
    );
  }

  return { pair, side, quantity };
}

class TradingEngine {
  constructor({
    pool,
    priceCache,
    supportedPairs = [],
    portfolioId = DEFAULT_PORTFOLIO_ID,
    maxPriceAgeMs = DEFAULT_MAX_PRICE_AGE_MS,
    clock = () => Date.now(),
  }) {
    this.pool = pool;
    this.priceCache = priceCache;
    this.supportedPairs = new Set(supportedPairs);
    this.portfolioId = portfolioId;
    this.maxPriceAgeMs = maxPriceAgeMs;
    this.clock = clock;
  }

  getFreshMarketPrice(pair) {
    const marketPrice = this.priceCache.getPrice(pair, this.clock());

    if (!marketPrice || !Number.isFinite(Number(marketPrice.price)) || Number(marketPrice.price) <= 0) {
      throw new TradingError('MARKET_PRICE_UNAVAILABLE', 'No market price is available.');
    }

    if (marketPrice.ageMs > this.maxPriceAgeMs) {
      throw new TradingError(
        'MARKET_PRICE_STALE',
        'Market price is stale. Please wait for a fresh price and try again.',
      );
    }

    return marketPrice;
  }

  async executeTrade(body) {
    const { pair, side, quantity } = normalizeTradeRequest(body, this.supportedPairs);
    this.getFreshMarketPrice(pair);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const marketPrice = this.getFreshMarketPrice(pair);
      const executionPrice = String(marketPrice.price);

      const portfolioResult = await client.query(
        `SELECT id, cash_balance
         FROM portfolio
         WHERE id = $1
         FOR UPDATE`,
        [this.portfolioId],
      );

      if (portfolioResult.rows.length === 0) {
        throw new TradingError('PORTFOLIO_NOT_FOUND', 'Portfolio not found.', 404);
      }

      if (side === 'BUY') {
        const cashResult = await client.query(
          `UPDATE portfolio
           SET cash_balance = cash_balance - ($2::numeric * $3::numeric), updated_at = NOW()
           WHERE id = $1 AND cash_balance >= ($2::numeric * $3::numeric)
           RETURNING cash_balance`,
          [this.portfolioId, quantity, executionPrice],
        );

        if (cashResult.rowCount !== 1) {
          throw new TradingError('INSUFFICIENT_CASH', 'Insufficient cash balance.');
        }

        await client.query(
          `INSERT INTO positions (
             portfolio_id, pair, quantity, average_entry_price, updated_at
           )
           VALUES ($1, $2, $3::numeric, $4::numeric, NOW())
           ON CONFLICT (portfolio_id, pair) DO UPDATE
           SET quantity = positions.quantity + EXCLUDED.quantity,
               average_entry_price = (
                 (positions.quantity * positions.average_entry_price)
                 + (EXCLUDED.quantity * EXCLUDED.average_entry_price)
               ) / (positions.quantity + EXCLUDED.quantity),
               updated_at = NOW()`,
          [this.portfolioId, pair, quantity, executionPrice],
        );
      } else {
        const positionResult = await client.query(
          `UPDATE positions
           SET quantity = quantity - $3::numeric,
               average_entry_price = CASE
                 WHEN quantity - $3::numeric = 0 THEN 0
                 ELSE average_entry_price
               END,
               updated_at = NOW()
           WHERE portfolio_id = $1 AND pair = $2 AND quantity >= $3::numeric
           RETURNING quantity`,
          [this.portfolioId, pair, quantity],
        );

        if (positionResult.rowCount !== 1) {
          throw new TradingError('INSUFFICIENT_HOLDINGS', 'Insufficient holdings.');
        }

        await client.query(
          `UPDATE portfolio
           SET cash_balance = cash_balance + ($2::numeric * $3::numeric), updated_at = NOW()
           WHERE id = $1`,
          [this.portfolioId, quantity, executionPrice],
        );
      }

      const tradeResult = await client.query(
        `INSERT INTO trades (
           portfolio_id, pair, side, quantity, execution_price, notional_value
         )
         VALUES ($1, $2, $3, $4::numeric, $5::numeric, $4::numeric * $5::numeric)
         RETURNING id, pair, side, quantity, execution_price, notional_value, created_at`,
        [this.portfolioId, pair, side, quantity, executionPrice],
      );

      await client.query('COMMIT');

      const trade = tradeResult.rows[0];
      return {
        trade: {
          id: trade.id,
          pair: trade.pair,
          side: trade.side,
          quantity: Number(trade.quantity),
          executionPrice: Number(trade.execution_price),
          notionalValue: Number(trade.notional_value),
          createdAt: trade.created_at,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  TradingEngine,
  TradingError,
  normalizeQuantity,
  normalizeTradeRequest,
};
