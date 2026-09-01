# Market

- `binanceClient.js` normalizes live Binance trade events and reconnects stalled streams.
- `binanceRestClient.js` loads and normalizes candle history for the chart API.
- `priceCache.js` owns the latest server-side prices and freshness metadata.
- `marketHub.js` broadcasts normalized market and chain events to browser clients.
