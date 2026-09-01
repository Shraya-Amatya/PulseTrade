import { useEffect, useMemo, useState } from 'react'
import { formatEther } from 'viem'
import { useGasPrice } from 'wagmi'
import { TARGET_CHAIN } from '../../config/wagmi.js'
import { useMarketPrice } from '../../hooks/useMarketPrices.js'
import { calculateSwapQuote, SWAP_QUOTE_DEFAULTS } from '../../services/swapQuote.js'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ethFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
})

function formatEth(value) {
  return value == null ? '—' : `${ethFormatter.format(value)} ETH`
}

function SwapMechanics() {
  const ethPrice = useMarketPrice('ETHUSDT')
  const [amountIn, setAmountIn] = useState('1000')
  const [slippage, setSlippage] = useState('0.50')
  const [deadlineMinutes, setDeadlineMinutes] = useState('20')
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [reviewMessage, setReviewMessage] = useState('')
  const { data: gasPrice, isLoading: isGasLoading, isError: isGasError } = useGasPrice({
    chainId: TARGET_CHAIN.id,
    query: { refetchInterval: 15000 },
  })

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const quote = useMemo(() => calculateSwapQuote({
    amountIn,
    marketPriceUsd: ethPrice,
    slippageBps: Number(slippage) * 100,
  }), [amountIn, ethPrice, slippage])

  const deadline = useMemo(() => {
    const minutes = Number(deadlineMinutes)
    return new Date(currentTime + minutes * 60 * 1000)
  }, [currentTime, deadlineMinutes])

  const gasEstimate = useMemo(() => {
    if (typeof gasPrice !== 'bigint' || typeof ethPrice !== 'number' || !Number.isFinite(ethPrice)) {
      return null
    }

    const gasEth = Number(formatEther(gasPrice * BigInt(SWAP_QUOTE_DEFAULTS.gasLimit)))
    return { gasEth, gasUsd: gasEth * ethPrice }
  }, [ethPrice, gasPrice])

  const handleReview = () => {
    if (!quote.ok) return
    setReviewMessage('Quote validated. Use the Uniswap v3 panel below for a separate on-chain testnet quote.')
  }

  return (
    <section className="dashboard-panel swap-mechanics" aria-labelledby="swap-mechanics-title">
      <div className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Phase 8 · AMM preview</p>
          <h2 id="swap-mechanics-title">Swap mechanics</h2>
        </div>
        <span className="panel-status">USDC → WETH</span>
      </div>

      <div className="swap-mechanics__content">
        <div className="swap-mechanics__form">
          <label className="field">
            <span>You pay</span>
            <div className="swap-input">
              <input
                type="text"
                inputMode="decimal"
                value={amountIn}
                onChange={(event) => {
                  setAmountIn(event.target.value)
                  setReviewMessage('')
                }}
                aria-label="USDC amount to pay"
              />
              <strong>USDC</strong>
            </div>
          </label>

          <div className="swap-arrow" aria-hidden="true">↓</div>

          <div className="swap-output">
            <span>You receive</span>
            <strong>{quote.ok ? formatEth(quote.amountOut) : '—'}</strong>
            <small>Estimated WETH received</small>
          </div>

          <div className="swap-settings">
            <label className="field">
              <span>Slippage tolerance</span>
              <div className="swap-input swap-input--compact">
                <input
                  type="text"
                  inputMode="decimal"
                  value={slippage}
                  onChange={(event) => {
                    setSlippage(event.target.value)
                    setReviewMessage('')
                  }}
                  aria-label="Slippage tolerance percentage"
                />
                <strong>%</strong>
              </div>
            </label>
            <label className="field">
              <span>Transaction deadline</span>
              <select value={deadlineMinutes} onChange={(event) => setDeadlineMinutes(event.target.value)}>
                <option value="10">10 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </label>
          </div>

          <button className="swap-mechanics__button" type="button" onClick={handleReview} disabled={!quote.ok}>
            Review simulated quote
          </button>
          <p className="swap-mechanics__note">This AMM preview does not request a wallet signature or submit a transaction.</p>
        </div>

        <div className="swap-breakdown" aria-live="polite">
          {quote.ok ? (
            <>
              <div><span>Minimum received</span><strong>{formatEth(quote.minimumReceived)}</strong></div>
              <div><span>Price impact</span><strong>{quote.priceImpactPercent.toFixed(2)}%</strong></div>
              <div><span>Pool fee</span><strong>{currencyFormatter.format(quote.fee)} USDC ({quote.feePercent.toFixed(2)}%)</strong></div>
              <div><span>Effective price</span><strong>{currencyFormatter.format(quote.effectivePrice)} / ETH</strong></div>
              <div><span>Post-swap pool price</span><strong>{currencyFormatter.format(quote.postSwapPrice)} / ETH</strong></div>
            </>
          ) : (
            <p className="swap-breakdown__error" role="alert">{quote.error}</p>
          )}

          <div>
            <span>Network fee estimate</span>
            <strong>{isGasLoading ? 'Loading…' : isGasError ? 'Unavailable' : gasEstimate ? `${currencyFormatter.format(gasEstimate.gasUsd)} (${formatEth(gasEstimate.gasEth)})` : 'Unavailable'}</strong>
          </div>
          <div><span>Deadline</span><strong>{deadline.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong></div>
          <p className="swap-breakdown__note">Quote uses the modeled USDC/ETH pool below. Gas preview uses a {SWAP_QUOTE_DEFAULTS.gasLimit.toLocaleString()}-unit simulated router estimate and the current Sepolia gas price.</p>
          {reviewMessage && <p className="swap-breakdown__success" role="status">{reviewMessage}</p>}
        </div>
      </div>
    </section>
  )
}

export default SwapMechanics
