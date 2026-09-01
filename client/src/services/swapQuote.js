export const SWAP_QUOTE_DEFAULTS = {
  poolFeeBps: 30,
  virtualLiquidityUsd: 850000,
  gasLimit: 120000,
  maxSlippageBps: 5000,
}

export function calculateSwapQuote({
  amountIn,
  marketPriceUsd,
  slippageBps,
  poolFeeBps = SWAP_QUOTE_DEFAULTS.poolFeeBps,
  virtualLiquidityUsd = SWAP_QUOTE_DEFAULTS.virtualLiquidityUsd,
}) {
  const input = Number(amountIn)
  const price = Number(marketPriceUsd)
  const slippage = Number(slippageBps)

  if (!Number.isFinite(input) || input <= 0) {
    return { ok: false, error: 'Enter a USDC amount greater than zero.' }
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: 'ETH market data is not available yet.' }
  }

  if (!Number.isFinite(slippage) || slippage < 0 || slippage > SWAP_QUOTE_DEFAULTS.maxSlippageBps) {
    return { ok: false, error: 'Slippage must be between 0% and 50%.' }
  }

  const fee = input * (poolFeeBps / 10000)
  const priceImpactPercent = Math.min(25, (input / virtualLiquidityUsd) * 100)
  const effectivePrice = price * (1 + priceImpactPercent / 100)
  const amountOut = (input - fee) / effectivePrice
  const minimumReceived = amountOut * (1 - slippage / 10000)

  return {
    ok: true,
    amountIn: input,
    amountOut,
    minimumReceived,
    fee,
    feePercent: poolFeeBps / 100,
    priceImpactPercent,
    effectivePrice,
    marketPriceUsd: price,
    slippagePercent: slippage / 100,
  }
}
