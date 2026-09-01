class PriceCache {
  constructor({ pairs = [], maxAgeMs = 5000 } = {}) {
    this.supportedPairs = new Set(pairs);
    this.maxAgeMs = maxAgeMs;
    this.prices = new Map();
  }

  update(priceEvent) {
    if (!this.supportedPairs.has(priceEvent.pair)) {
      return null;
    }

    const cachedPrice = {
      ...priceEvent,
      receivedAt: Date.now(),
    };

    this.prices.set(priceEvent.pair, cachedPrice);
    return cachedPrice;
  }

  get(pair) {
    return this.prices.get(pair) || null;
  }

  getPrice(pair, now = Date.now()) {
    const cachedPrice = this.get(pair);

    if (!cachedPrice) {
      return null;
    }

    return {
      ...cachedPrice,
      ageMs: Math.max(0, now - cachedPrice.receivedAt),
    };
  }

  isFresh(pair, now = Date.now()) {
    const cachedPrice = this.get(pair);
    return Boolean(cachedPrice && now - cachedPrice.receivedAt <= this.maxAgeMs);
  }

  getSnapshot() {
    return [...this.prices.values()].map((price) => ({ ...price }));
  }
}

module.exports = PriceCache;
