import { useMarketChange, useMarketPrice, useMarketStatus } from '../../hooks/useMarketPrices.js'

const MARKETS = [
  { pair: 'BTCUSDT', label: 'BTC/USDT' },
  { pair: 'ETHUSDT', label: 'ETH/USDT' },
  { pair: 'SOLUSDT', label: 'SOL/USDT' },
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function MarketTicker() {
  const status = useMarketStatus()

  return (
    <section className="market-ticker" aria-label="Live market prices" aria-busy={status !== 'connected'}>
      {MARKETS.map((market) => (
        <MarketCard key={market.pair} {...market} />
      ))}
    </section>
  )
}

function MarketCard({ pair, label }) {
  const price = useMarketPrice(pair)
  const change = useMarketChange(pair)
  const direction = change < 0 ? 'negative' : 'positive'

  return (
    <article className="market-card">
      <span className="market-card__symbol">{label}</span>
      <strong className="market-card__price">
        {price == null ? 'Loading…' : currencyFormatter.format(price)}
      </strong>
      <span className={`market-card__change market-card__change--${direction}`}>
        {change >= 0 ? '+' : ''}
        {change.toFixed(2)}%
      </span>
    </article>
  )
}

export default MarketTicker
