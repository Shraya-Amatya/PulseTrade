const { EventEmitter } = require('node:events');
const WebSocket = require('ws');

function normalizeTradeMessage(rawMessage, supportedPairs = []) {
  let payload;

  try {
    payload = JSON.parse(rawMessage.toString());
  } catch {
    return null;
  }

  const trade = payload.data || payload;
  const pair = typeof trade.s === 'string' ? trade.s.toUpperCase() : null;

  if (
    trade.e !== 'trade' ||
    !pair ||
    !supportedPairs.includes(pair) ||
    !Number.isFinite(Number(trade.p)) ||
    !Number.isFinite(Number(trade.q))
  ) {
    return null;
  }

  return {
    type: 'price',
    pair,
    price: Number(trade.p),
    quantity: Number(trade.q),
    eventTime: Number(trade.E),
    tradeTime: Number(trade.T),
  };
}

class BinanceClient extends EventEmitter {
  constructor({
    url,
    pairs = [],
    reconnectBaseMs = 1000,
    reconnectMaxMs = 30000,
    idleTimeoutMs = 10000,
    WebSocketImpl = WebSocket,
  }) {
    super();
    this.url = url;
    this.pairs = pairs;
    this.reconnectBaseMs = reconnectBaseMs;
    this.reconnectMaxMs = reconnectMaxMs;
    this.idleTimeoutMs = idleTimeoutMs;
    this.WebSocketImpl = WebSocketImpl;
    this.socket = null;
    this.reconnectTimer = null;
    this.idleTimer = null;
    this.reconnectAttempt = 0;
    this.stopped = true;
  }

  connect() {
    if (!this.stopped && this.socket) {
      return;
    }

    this.stopped = false;
    this.#openSocket();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.idleTimer);
    this.reconnectTimer = null;
    this.idleTimer = null;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }
  }

  #openSocket() {
    if (this.stopped) {
      return;
    }

    this.emit('status', { status: 'connecting' });
    const socket = new this.WebSocketImpl(this.url);
    this.socket = socket;
    let isReceivingTrades = false;

    socket.on('open', () => {
      this.emit('status', { status: 'waiting' });
      this.#armIdleTimer(socket);
    });

    socket.on('message', (message) => {
      const normalizedEvent = normalizeTradeMessage(message, this.pairs);

      if (normalizedEvent) {
        this.#armIdleTimer(socket);

        if (!isReceivingTrades) {
          isReceivingTrades = true;
          this.reconnectAttempt = 0;
          this.emit('status', { status: 'connected' });
        }

        this.emit('trade', normalizedEvent);
      }
    });

    socket.on('error', (error) => {
      this.emit('error', error);
    });

    socket.on('close', () => {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;

      if (this.socket === socket) {
        this.socket = null;
      }

      if (!this.stopped) {
        this.emit('status', { status: 'disconnected' });
        this.#scheduleReconnect();
      }
    });
  }

  #armIdleTimer(socket) {
    clearTimeout(this.idleTimer);

    if (!Number.isFinite(this.idleTimeoutMs) || this.idleTimeoutMs <= 0) {
      return;
    }

    this.idleTimer = setTimeout(() => {
      if (this.stopped || this.socket !== socket) return;

      this.emit('status', { status: 'stale' });
      socket.terminate();
    }, this.idleTimeoutMs);
    this.idleTimer.unref?.();
  }

  #scheduleReconnect() {
    if (this.reconnectTimer || this.stopped) {
      return;
    }

    const delay = Math.min(
      this.reconnectBaseMs * 2 ** this.reconnectAttempt,
      this.reconnectMaxMs,
    );
    this.reconnectAttempt += 1;

    this.emit('status', { status: 'reconnecting', retryInMs: delay });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.#openSocket();
    }, delay);
    this.reconnectTimer.unref?.();
  }
}

module.exports = { BinanceClient, normalizeTradeMessage };
