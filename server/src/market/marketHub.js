const { WebSocketServer } = require('ws');
const config = require('../config');
const { BinanceClient } = require('./binanceClient');
const PriceCache = require('./priceCache');

class MarketHub {
  constructor({
    server,
    websocketPath = config.websocketPath,
    binanceClient = new BinanceClient({
      url: config.binanceStreamUrl,
      pairs: config.marketPairs,
    }),
    priceCache = new PriceCache({ pairs: config.marketPairs }),
  }) {
    this.server = server;
    this.websocketPath = websocketPath;
    this.websocketPaths = new Set([websocketPath, '/', '/ws']);
    this.binanceClient = binanceClient;
    this.priceCache = priceCache;
    this.clients = new Set();
    this.connectionStatus = 'disconnected';
    this.webSocketServer = new WebSocketServer({ noServer: true });

    this.handleUpgrade = (request, socket, head) => {
      const requestUrl = new URL(request.url, 'http://localhost');

      if (!this.websocketPaths.has(requestUrl.pathname)) {
        socket.destroy();
        return;
      }

      this.webSocketServer.handleUpgrade(request, socket, head, (client) => {
        this.webSocketServer.emit('connection', client, request);
      });
    };

    this.server.on('upgrade', this.handleUpgrade);
    this.webSocketServer.on('connection', (client) => {
      this.clients.add(client);
      this.send(client, { type: 'connection', status: this.connectionStatus });

      for (const price of this.priceCache.getSnapshot()) {
        this.send(client, this.toPublicPriceEvent(price));
      }

      client.on('close', () => this.clients.delete(client));
      client.on('error', () => this.clients.delete(client));
    });

    this.binanceClient.on('trade', (priceEvent) => {
      const cachedPrice = this.priceCache.update(priceEvent);

      if (cachedPrice) {
        this.broadcast(this.toPublicPriceEvent(cachedPrice));
      }
    });

    this.binanceClient.on('status', ({ status, retryInMs }) => {
      this.connectionStatus = status;
      this.broadcast({ type: 'connection', status, retryInMs });
    });

    this.binanceClient.on('error', (error) => {
      this.broadcast({ type: 'error', message: 'Upstream market data error' });
      console.error('Binance market-data error:', error.message);
    });
  }

  start() {
    this.binanceClient.connect();
  }

  stop() {
    this.binanceClient.stop();
    for (const client of this.clients) {
      client.close();
    }
    this.webSocketServer.close();
    this.server.off('upgrade', this.handleUpgrade);
  }

  send(client, message) {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  }

  toPublicPriceEvent(priceEvent) {
    return {
      type: 'price',
      pair: priceEvent.pair,
      price: priceEvent.price,
      quantity: priceEvent.quantity,
      eventTime: priceEvent.eventTime,
      tradeTime: priceEvent.tradeTime,
    };
  }

  broadcast(message) {
    for (const client of this.clients) {
      this.send(client, message);
    }
  }
}

module.exports = MarketHub;
