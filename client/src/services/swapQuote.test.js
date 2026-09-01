import test from 'node:test'
import assert from 'node:assert/strict'
import { createDemoPool } from './ammPool.js'
import { selectBestRoute } from './routeSelection.js'
import { calculateSwapQuote } from './swapQuote.js'

test('builds a constant-product pool from the live market price', () => {
  const pool = createDemoPool(2500)

  assert.equal(pool.priceUsd, 2500)
  assert.equal(pool.ethReserve, 400)
  assert.equal(pool.usdcReserve, 1000000)
  assert.equal(pool.invariant, pool.usdcReserve * pool.ethReserve)
})

test('calculates fee, price impact, output, and minimum received', () => {
  const quote = calculateSwapQuote({
    amountIn: '1000',
    marketPriceUsd: 2500,
    slippageBps: 50,
  })

  assert.equal(quote.ok, true)
  assert.equal(quote.fee, 3)
  assert.ok(quote.priceImpactPercent > 0)
  assert.ok(quote.minimumReceived < quote.amountOut)
  assert.ok(quote.amountOut > 0)
  assert.ok(quote.postSwapPrice > quote.marketPriceUsd)
})

test('rejects invalid input and excessive slippage', () => {
  assert.equal(calculateSwapQuote({ amountIn: '0', marketPriceUsd: 2500, slippageBps: 50 }).ok, false)
  assert.equal(calculateSwapQuote({ amountIn: '1000', marketPriceUsd: 2500, slippageBps: 5001 }).ok, false)
})

test('selects the highest-output available route', () => {
  const route = selectBestRoute([
    { fee: 500, pool: '0x1', amountOut: 10n },
    { fee: 3000, pool: '0x2', amountOut: 12n },
    { fee: 10000, pool: null, amountOut: 99n },
  ])

  assert.equal(route.fee, 3000)
})
