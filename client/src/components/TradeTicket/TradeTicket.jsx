import { useState } from 'react'
import { submitTrade } from '../../services/api.js'
import { useMarketPrice } from '../../hooks/useMarketPrices.js'

const pairs = [
  { value: 'BTCUSDT', label: 'BTC/USDT' },
  { value: 'ETHUSDT', label: 'ETH/USDT' },
  { value: 'SOLUSDT', label: 'SOL/USDT' },
]

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function TradeTicket({ onTrade }) {
  const [side, setSide] = useState('BUY')
  const [pair, setPair] = useState('BTCUSDT')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const marketPrice = useMarketPrice(pair)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')

    try {
      const result = await submitTrade({ pair, side, quantity })
      const trade = result.trade
      setQuantity('')
      setMessage(`${trade.side} filled at ${priceFormatter.format(trade.executionPrice)}.`)
      onTrade?.()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="dashboard-panel trade-ticket" aria-labelledby="trade-ticket-title">
      <div className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Market order</p>
          <h2 id="trade-ticket-title">Trade ticket</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="trade-ticket__side" aria-label="Order side">
          {['BUY', 'SELL'].map((orderSide) => (
            <button
              type="button"
              className={side === orderSide ? 'is-active' : ''}
              key={orderSide}
              onClick={() => setSide(orderSide)}
              disabled={submitting}
            >
              {orderSide === 'BUY' ? 'Buy' : 'Sell'}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Pair</span>
          <select value={pair} onChange={(event) => setPair(event.target.value)} disabled={submitting}>
            {pairs.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Quantity</span>
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="0.00"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={submitting}
            required
          />
        </label>

        <div className="trade-ticket__quote">
          <span>Live execution quote</span>
          <strong>{marketPrice ? priceFormatter.format(marketPrice) : 'Waiting for price…'}</strong>
        </div>

        <button className="trade-ticket__submit" type="submit" disabled={submitting || !marketPrice}>
          {submitting ? 'Submitting…' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${pair.replace('USDT', '')}`}
        </button>

        <p className="trade-ticket__hint">The server chooses the execution price. Any client price is ignored.</p>
        {message && <p className="trade-ticket__message" role="status">{message}</p>}
        {error && <p className="trade-ticket__error" role="alert">{error}</p>}
      </form>
    </section>
  )
}

export default TradeTicket
