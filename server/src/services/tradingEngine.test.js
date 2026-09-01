const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TradingEngine,
  TradingError,
  normalizeQuantity,
  normalizeTradeRequest,
} = require('./tradingEngine');

function createPriceCache(price, ageMs = 0) {
  return {
    getPrice() {
      return price === null ? null : { price, ageMs };
    },
  };
}

function createDatabaseClient({
  portfolio = { id: 1, cash_balance: '10000' },
  positionUpdate = { rowCount: 1, rows: [{ quantity: '0.9' }] },
  trade = {
    id: '1',
    pair: 'BTCUSDT',
    side: 'BUY',
    quantity: '0.1',
    execution_price: '50000',
    notional_value: '5000',
    created_at: '2026-09-01T00:00:00.000Z',
  },
  failOnTradeInsert = false,
} = {}) {
  const queries = [];
  const client = {
    queries,
    async query(text, params = []) {
      queries.push({ text, params });

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rowCount: 0, rows: [] };
      if (text.includes('FROM portfolio')) return { rowCount: 1, rows: [portfolio] };
      if (text.includes('UPDATE portfolio') && text.includes('cash_balance -')) {
        return { rowCount: 1, rows: [{ cash_balance: '5000' }] };
      }
      if (text.includes('INSERT INTO positions')) return { rowCount: 1, rows: [] };
      if (text.includes('UPDATE positions')) return positionUpdate;
      if (text.includes('INSERT INTO trades')) {
        if (failOnTradeInsert) throw new Error('trade insert failed');
        return { rowCount: 1, rows: [trade] };
      }

      return { rowCount: 1, rows: [] };
    },
    releaseCalled: false,
    release() {
      this.releaseCalled = true;
    },
  };

  return {
    client,
    pool: {
      async connect() {
        return client;
      },
    },
  };
}

test('normalizes valid trade input and does not accept excessive quantity precision', () => {
  const supportedPairs = new Set(['BTCUSDT']);

  assert.deepEqual(
    normalizeTradeRequest({ pair: 'BTC/USDT', side: 'buy', quantity: '0.125' }, supportedPairs),
    { pair: 'BTCUSDT', side: 'BUY', quantity: '0.125' },
  );
  assert.equal(normalizeQuantity('0.1234567890123'), null);
});

test('executes a BUY at the server cache price and commits the transaction', async () => {
  const { client, pool } = createDatabaseClient();
  const engine = new TradingEngine({
    pool,
    priceCache: createPriceCache(50000),
    supportedPairs: ['BTCUSDT'],
  });

  const result = await engine.executeTrade({
    pair: 'BTCUSDT',
    side: 'BUY',
    quantity: '0.1',
    price: 1,
  });

  const tradeInsert = client.queries.find(({ text }) => text.includes('INSERT INTO trades'));
  assert.equal(result.trade.executionPrice, 50000);
  assert.deepEqual(tradeInsert.params, [1, 'BTCUSDT', 'BUY', '0.1', '50000']);
  assert.equal(client.queries.at(-1).text, 'COMMIT');
  assert.equal(client.releaseCalled, true);
});

test('rejects a stale market price before opening a database transaction', async () => {
  const { pool, client } = createDatabaseClient();
  const engine = new TradingEngine({
    pool,
    priceCache: createPriceCache(50000, 5001),
    supportedPairs: ['BTCUSDT'],
  });

  await assert.rejects(
    engine.executeTrade({ pair: 'BTCUSDT', side: 'BUY', quantity: '0.1' }),
    (error) => error instanceof TradingError && error.code === 'MARKET_PRICE_STALE',
  );
  assert.equal(client.queries.length, 0);
});

test('rolls back when a BUY cannot be funded', async () => {
  const { client, pool } = createDatabaseClient({
    positionUpdate: { rowCount: 0, rows: [] },
  });
  client.query = async function query(text, params = []) {
    this.queries.push({ text, params });
    if (text === 'BEGIN' || text === 'ROLLBACK') return { rowCount: 0, rows: [] };
    if (text.includes('FROM portfolio')) return { rowCount: 1, rows: [{ id: 1, cash_balance: '10' }] };
    if (text.includes('UPDATE portfolio') && text.includes('cash_balance -')) return { rowCount: 0, rows: [] };
    return { rowCount: 0, rows: [] };
  };

  await assert.rejects(
    engineFor(pool).executeTrade({ pair: 'BTCUSDT', side: 'BUY', quantity: '0.1' }),
    (error) => error.code === 'INSUFFICIENT_CASH',
  );
  assert.equal(client.queries.at(-1).text, 'ROLLBACK');
});

test('rolls back when a SELL exceeds holdings', async () => {
  const { client, pool } = createDatabaseClient({
    positionUpdate: { rowCount: 0, rows: [] },
  });
  const engine = engineFor(pool);

  await assert.rejects(
    engine.executeTrade({ pair: 'BTCUSDT', side: 'SELL', quantity: '1' }),
    (error) => error.code === 'INSUFFICIENT_HOLDINGS',
  );
  assert.equal(client.queries.at(-1).text, 'ROLLBACK');
});

test('rolls back all changes when trade persistence fails', async () => {
  const { client, pool } = createDatabaseClient({ failOnTradeInsert: true });
  const engine = engineFor(pool);

  await assert.rejects(
    engine.executeTrade({ pair: 'BTCUSDT', side: 'BUY', quantity: '0.1' }),
    /trade insert failed/,
  );
  assert.equal(client.queries.at(-1).text, 'ROLLBACK');
});

function engineFor(pool) {
  return new TradingEngine({
    pool,
    priceCache: createPriceCache(50000),
    supportedPairs: ['BTCUSDT'],
  });
}
