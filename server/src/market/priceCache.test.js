const test = require('node:test');
const assert = require('node:assert/strict');
const PriceCache = require('./priceCache');

test('stores supported prices and reports freshness', () => {
  const cache = new PriceCache({ pairs: ['BTCUSDT'], maxAgeMs: 5000 });
  const event = {
    type: 'price',
    pair: 'BTCUSDT',
    price: 65000.12,
    quantity: 0.001,
    eventTime: 1000,
    tradeTime: 1000,
  };

  cache.update(event);

  assert.equal(cache.get('BTCUSDT').price, 65000.12);
  assert.equal(cache.isFresh('BTCUSDT'), true);
  assert.equal(cache.isFresh('BTCUSDT', Date.now() + 5001), false);
  assert.equal(cache.update({ ...event, pair: 'DOGEUSDT' }), null);
});
