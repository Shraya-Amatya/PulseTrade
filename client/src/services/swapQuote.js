import { calculateAmmQuote, createDemoPool, DEMO_POOL_DEFAULTS } from './ammPool.js'

export const SWAP_QUOTE_DEFAULTS = {
  poolFeeBps: DEMO_POOL_DEFAULTS.feeBps,
  poolEthReserve: DEMO_POOL_DEFAULTS.ethReserve,
  gasLimit: 120000,
  maxSlippageBps: 5000,
}

export function calculateSwapQuote({
  amountIn,
  marketPriceUsd,
  slippageBps,
}) {
  const pool = createDemoPool(marketPriceUsd, {
    ethReserve: SWAP_QUOTE_DEFAULTS.poolEthReserve,
    feeBps: SWAP_QUOTE_DEFAULTS.poolFeeBps,
  })
  return calculateAmmQuote({ amountIn, pool, slippageBps })
}
