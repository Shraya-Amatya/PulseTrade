const assert = require('node:assert/strict');
const test = require('node:test');
const { BinanceRestClient, normalizeKlines } = require('./binanceRestClient');

test('normalizes Binance klines into the PulseTrade candle contract', () => {
  const candles = normalizeKlines([
    [1710000000000, '65000.10', '65100.20', '64900.30', '65050.40', '12.5'],
    ['invalid', '1', '2', '3', '4', '5'],
  ]);

  assert.deepEqual(candles, [{
    time: 1710000000,
    open: 65000.1,
    high: 65100.2,
    low: 64900.3,
    close: 65050.4,
    volume: 12.5,
  }]);
});

test('requests bounded candle history from the configured market-data host', async () => {
  let requestedUrl;
  const client = new BinanceRestClient({
    baseUrl: 'https://market.example',
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => [[1710000000000, '1', '2', '0.5', '1.5', '10']],
      };
    },
  });

  const candles = await client.getCandles({ pair: 'BTCUSDT', interval: '1m', limit: 9999 });

  assert.equal(requestedUrl.origin, 'https://market.example');
  assert.equal(requestedUrl.pathname, '/api/v3/klines');
  assert.equal(requestedUrl.searchParams.get('symbol'), 'BTCUSDT');
  assert.equal(requestedUrl.searchParams.get('interval'), '1m');
  assert.equal(requestedUrl.searchParams.get('limit'), '500');
  assert.equal(candles[0].close, 1.5);
});

test('rejects unsupported candle intervals before making a request', async () => {
  const client = new BinanceRestClient({
    baseUrl: 'https://market.example',
    fetchImpl: () => {
      throw new Error('fetch should not be called');
    },
  });

  await assert.rejects(
    client.getCandles({ pair: 'BTCUSDT', interval: '2m' }),
    /Unsupported candle interval/,
  );
});
