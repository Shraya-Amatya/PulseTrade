const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeBlockEvent, normalizeSwapEvent } = require('./eventNormalizer');

test('normalizes a block event without losing bigint precision', () => {
  assert.deepEqual(normalizeBlockEvent({ blockNumber: 12345678901234567890n, observedAt: 1 }), {
    type: 'block',
    network: 'sepolia',
    blockNumber: '12345678901234567890',
    observedAt: 1,
  });
});

test('normalizes a Uniswap swap event into the public contract', () => {
  const event = normalizeSwapEvent({
    address: '0xpool',
    transactionHash: '0xtx',
    blockNumber: 42n,
    logIndex: 3n,
    args: {
      sender: '0xsender',
      recipient: '0xrecipient',
      amount0: -1000n,
      amount1: 500n,
    },
  }, { observedAt: 2 });

  assert.deepEqual(event, {
    type: 'chain_swap',
    network: 'sepolia',
    pool: '0xpool',
    transactionHash: '0xtx',
    blockNumber: '42',
    logIndex: '3',
    sender: '0xsender',
    recipient: '0xrecipient',
    amount0: '-1000',
    amount1: '500',
    observedAt: 2,
  });
});
