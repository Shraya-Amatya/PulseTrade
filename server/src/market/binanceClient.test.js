const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTradeMessage } = require('./binanceClient');

test('normalizes a Binance combined trade event', () => {
  const rawMessage = JSON.stringify({
    stream: 'btcusdt@trade',
    data: {
      e: 'trade',
      E: 1710000000000,
      s: 'BTCUSDT',
      p: '65000.12',
      q: '0.001',
      T: 1710000000001,
    },
  });

  assert.deepEqual(normalizeTradeMessage(rawMessage, ['BTCUSDT']), {
    type: 'price',
    pair: 'BTCUSDT',
    price: 65000.12,
    quantity: 0.001,
    eventTime: 1710000000000,
    tradeTime: 1710000000001,
  });
});

test('ignores malformed and unsupported Binance events', () => {
  assert.equal(normalizeTradeMessage('not-json', ['BTCUSDT']), null);
  assert.equal(
    normalizeTradeMessage(
      JSON.stringify({ e: 'ticker', s: 'BTCUSDT', p: '65000.12', q: '0.001' }),
      ['BTCUSDT'],
    ),
    null,
  );
  assert.equal(
    normalizeTradeMessage(
      JSON.stringify({ e: 'trade', s: 'DOGEUSDT', p: '1', q: '1' }),
      ['BTCUSDT'],
    ),
    null,
  );
});
