const DEFAULT_INTERVAL = '1m';
const DEFAULT_LIMIT = 120;
const DEFAULT_TIMEOUT_MS = 5000;
const SUPPORTED_INTERVALS = new Set(['1s', '1m', '5m', '15m', '1h']);

function normalizeKlines(payload) {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((row) => {
      if (!Array.isArray(row) || row.length < 6) return null;

      const openTime = Number(row[0]);
      const open = Number(row[1]);
      const high = Number(row[2]);
      const low = Number(row[3]);
      const close = Number(row[4]);
      const volume = Number(row[5]);

      if (
        !Number.isFinite(openTime) ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close) ||
        !Number.isFinite(volume)
      ) {
        return null;
      }

      return {
        time: Math.floor(openTime / 1000),
        open,
        high,
        low,
        close,
        volume,
      };
    })
    .filter(Boolean);
}

class BinanceRestClient {
  constructor({
    baseUrl,
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async getCandles({
    pair,
    interval = DEFAULT_INTERVAL,
    limit = DEFAULT_LIMIT,
  }) {
    if (!SUPPORTED_INTERVALS.has(interval)) {
      throw new Error('Unsupported candle interval');
    }

    const normalizedLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 30), 500);
    const url = new URL('/api/v3/klines', this.baseUrl);
    url.searchParams.set('symbol', pair);
    url.searchParams.set('interval', interval);
    url.searchParams.set('limit', String(normalizedLimit));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    timeout.unref?.();

    try {
      const response = await this.fetchImpl(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Binance candle request failed with status ${response.status}`);
      }

      const candles = normalizeKlines(await response.json());

      if (candles.length === 0) {
        throw new Error('Binance returned no usable candle data');
      }

      return candles;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = {
  BinanceRestClient,
  SUPPORTED_INTERVALS,
  normalizeKlines,
};
