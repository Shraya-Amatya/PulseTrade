export const DEMO_POOL_DEFAULTS = {
  ethReserve: 400,
  feeBps: 30,
  lpSharePercent: 100,
}

export function createDemoPool(marketPriceUsd, options = {}) {
  const price = Number(marketPriceUsd)
  const ethReserve = options.ethReserve ?? DEMO_POOL_DEFAULTS.ethReserve
  const feeBps = options.feeBps ?? DEMO_POOL_DEFAULTS.feeBps

  if (!Number.isFinite(price) || price <= 0 || ethReserve <= 0) return null

  const usdcReserve = price * ethReserve
  return {
    ethReserve,
    usdcReserve,
    liquidityUsd: usdcReserve * 2,
    priceUsd: usdcReserve / ethReserve,
    invariant: usdcReserve * ethReserve,
    feeBps,
    lpSharePercent: DEMO_POOL_DEFAULTS.lpSharePercent,
  }
}

export function calculateAmmQuote({ amountIn, pool, slippageBps }) {
  const input = Number(amountIn)
  const slippage = Number(slippageBps)

  if (!pool) return { ok: false, error: 'ETH market data is not available yet.' }
  if (!Number.isFinite(input) || input <= 0) {
    return { ok: false, error: 'Enter a USDC amount greater than zero.' }
  }
  if (!Number.isFinite(slippage) || slippage < 0 || slippage > 5000) {
    return { ok: false, error: 'Slippage must be between 0% and 50%.' }
  }

  const fee = input * (pool.feeBps / 10000)
  const inputAfterFee = input - fee
  const nextUsdcReserveForQuote = pool.usdcReserve + inputAfterFee
  const nextEthReserveForQuote = pool.invariant / nextUsdcReserveForQuote
  const amountOut = pool.ethReserve - nextEthReserveForQuote
  const minimumReceived = amountOut * (1 - slippage / 10000)
  const executionPriceBeforeFee = inputAfterFee / amountOut
  const effectivePrice = input / amountOut
  const priceImpactPercent = ((executionPriceBeforeFee - pool.priceUsd) / pool.priceUsd) * 100
  const postSwapUsdcReserve = pool.usdcReserve + input
  const postSwapEthReserve = pool.ethReserve - amountOut

  return {
    ok: true,
    amountIn: input,
    amountOut,
    minimumReceived,
    fee,
    feePercent: pool.feeBps / 100,
    priceImpactPercent,
    effectivePrice,
    marketPriceUsd: pool.priceUsd,
    slippagePercent: slippage / 100,
    postSwapPrice: postSwapUsdcReserve / postSwapEthReserve,
  }
}
