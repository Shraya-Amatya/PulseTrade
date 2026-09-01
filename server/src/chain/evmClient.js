const { EventEmitter } = require('node:events');
const { createPublicClient, http, webSocket } = require('viem');
const { sepolia } = require('viem/chains');
const { normalizeBlockEvent, normalizeSwapEvent } = require('./eventNormalizer');

const swapEvent = {
  type: 'event',
  name: 'Swap',
  inputs: [
    { indexed: true, name: 'sender', type: 'address' },
    { indexed: true, name: 'recipient', type: 'address' },
    { indexed: false, name: 'amount0', type: 'int256' },
    { indexed: false, name: 'amount1', type: 'int256' },
    { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
    { indexed: false, name: 'liquidity', type: 'uint128' },
    { indexed: false, name: 'tick', type: 'int24' },
  ],
};

class EvmClient extends EventEmitter {
  constructor({ rpcUrl = '', wsUrl = '', poolAddresses = [] } = {}) {
    super();
    this.poolAddresses = poolAddresses;
    this.unwatchers = [];
    this.client = null;

    if (rpcUrl || wsUrl) {
      const transport = wsUrl ? webSocket(wsUrl) : http(rpcUrl);
      this.client = createPublicClient({ chain: sepolia, transport });
    }
  }

  start() {
    if (!this.client) {
      this.emit('status', { status: 'disabled' });
      return;
    }

    try {
      this.unwatchers.push(this.client.watchBlockNumber({
        emitOnBegin: true,
        onBlockNumber: (blockNumber) => {
          const event = normalizeBlockEvent({ blockNumber });
          if (event) this.emit('event', event);
        },
        onError: (error) => this.emit('error', error),
      }));

      if (this.poolAddresses.length > 0) {
        this.unwatchers.push(this.client.watchEvent({
          address: this.poolAddresses,
          event: swapEvent,
          onLogs: (logs) => {
            for (const log of logs) {
              const event = normalizeSwapEvent(log);
              if (event) this.emit('event', event);
            }
          },
          onError: (error) => this.emit('error', error),
        }));
      }

      this.emit('status', { status: 'connected' });
    } catch (error) {
      this.emit('error', error);
    }
  }

  stop() {
    for (const unwatch of this.unwatchers) unwatch();
    this.unwatchers = [];
    this.client?.transport?.dispose?.();
  }
}

module.exports = EvmClient;
