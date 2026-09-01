const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { BinanceClient, normalizeTradeMessage } = require('./binanceClient');

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

test('marks a silent upstream connection stale and reconnects it', async () => {
  class FakeWebSocket extends EventEmitter {
    constructor() {
      super();
      FakeWebSocket.instance = this;
    }

    close() {
      this.emit('close');
    }

    terminate() {
      this.terminated = true;
      this.emit('close');
    }
  }

  const client = new BinanceClient({
    url: 'wss://market.example',
    pairs: ['BTCUSDT'],
    idleTimeoutMs: 20,
    reconnectBaseMs: 1000,
    WebSocketImpl: FakeWebSocket,
  });
  const statuses = [];
  client.on('status', ({ status }) => statuses.push(status));

  client.connect();
  FakeWebSocket.instance.emit('open');
  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(FakeWebSocket.instance.terminated, true);
  assert.ok(statuses.includes('waiting'));
  assert.ok(statuses.includes('stale'));
  assert.ok(statuses.includes('reconnecting'));

  client.stop();
});
