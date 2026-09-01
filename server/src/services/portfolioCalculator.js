const DEFAULT_MAX_PRICE_AGE_MS = 5000;

function calculatePortfolioSummary({
  cashBalance,
  positions,
  getPrice,
  now = Date.now(),
  maxPriceAgeMs = DEFAULT_MAX_PRICE_AGE_MS,
}) {
  let marketDataStatus = 'ready';
  let positionValueTotal = 0;
  let unrealizedPnl = 0;

  const calculatedPositions = positions.map((position) => {
    const quantity = Number(position.quantity);
    const averageEntryPrice = Number(position.average_entry_price ?? position.averageEntryPrice);
    const marketPrice = getPrice?.(position.pair, now);
    const currentPrice = marketPrice && marketPrice.ageMs <= maxPriceAgeMs
      ? Number(marketPrice.price)
      : null;
    const hasUsablePrice = Number.isFinite(currentPrice) && currentPrice > 0;

    if (!hasUsablePrice) {
      if (!marketPrice) {
        marketDataStatus = 'unavailable';
      } else if (marketDataStatus === 'ready') {
        marketDataStatus = 'stale';
      }
    }

    const positionValue = hasUsablePrice ? quantity * currentPrice : null;
    const positionPnl = hasUsablePrice
      ? (currentPrice - averageEntryPrice) * quantity
      : null;

    if (positionValue !== null) positionValueTotal += positionValue;
    if (positionPnl !== null) unrealizedPnl += positionPnl;

    return {
      pair: position.pair,
      quantity,
      averageEntryPrice,
      currentPrice,
      positionValue,
      unrealizedPnl: positionPnl,
    };
  });

  const hasCompleteValuation = calculatedPositions.every(
    (position) => position.positionValue !== null,
  );
  const normalizedCashBalance = Number(cashBalance);

  return {
    cashBalance: normalizedCashBalance,
    totalValue: hasCompleteValuation ? normalizedCashBalance + positionValueTotal : null,
    unrealizedPnl: hasCompleteValuation ? unrealizedPnl : null,
    marketDataStatus,
    positions: calculatedPositions,
  };
}

module.exports = { calculatePortfolioSummary };
