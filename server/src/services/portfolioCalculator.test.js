const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePortfolioSummary } = require('./portfolioCalculator');

test('calculates position value, total value, and unrealized P/L from fresh prices', () => {
  const result = calculatePortfolioSummary({
    cashBalance: '4000',
    positions: [{ pair: 'BTCUSDT', quantity: '0.1', average_entry_price: '50000' }],
    getPrice: () => ({ price: 55000, ageMs: 100 }),
  });

  assert.deepEqual(result, {
    cashBalance: 4000,
    totalValue: 9500,
    unrealizedPnl: 500,
    marketDataStatus: 'ready',
    positions: [{
      pair: 'BTCUSDT',
      quantity: 0.1,
      averageEntryPrice: 50000,
      currentPrice: 55000,
      positionValue: 5500,
      unrealizedPnl: 500,
    }],
  });
});

test('does not publish a misleading total when a position price is stale', () => {
  const result = calculatePortfolioSummary({
    cashBalance: '4000',
    positions: [{ pair: 'BTCUSDT', quantity: '0.1', average_entry_price: '50000' }],
    getPrice: () => ({ price: 55000, ageMs: 5001 }),
  });

  assert.equal(result.cashBalance, 4000);
  assert.equal(result.totalValue, null);
  assert.equal(result.unrealizedPnl, null);
  assert.equal(result.marketDataStatus, 'stale');
  assert.equal(result.positions[0].positionValue, null);
});

test('keeps a cash-only portfolio fully valued without market data', () => {
  const result = calculatePortfolioSummary({
    cashBalance: '10000',
    positions: [],
    getPrice: () => null,
  });

  assert.equal(result.totalValue, 10000);
  assert.equal(result.unrealizedPnl, 0);
  assert.equal(result.marketDataStatus, 'ready');
});
