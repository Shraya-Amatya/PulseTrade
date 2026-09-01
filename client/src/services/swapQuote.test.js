import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSwapQuote } from './swapQuote.js'

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
