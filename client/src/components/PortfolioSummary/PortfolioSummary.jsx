const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function PortfolioSummary({ portfolio, loading }) {
  const items = [
    { label: 'Cash balance', value: portfolio?.cashBalance },
    { label: 'Total value', value: portfolio?.totalValue },
    { label: 'Unrealized P/L', value: portfolio?.unrealizedPnl },
  ]

  return (
    <section className="dashboard-panel portfolio-summary" aria-labelledby="portfolio-title" aria-busy={loading}>
      <div className="panel-heading">
        <h2 id="portfolio-title">Portfolio</h2>
        {portfolio?.marketDataStatus && portfolio.marketDataStatus !== 'ready' && (
          <span className="panel-status" role="status">
            {portfolio.marketDataStatus === 'stale' ? 'Market data stale' : 'Market data unavailable'}
          </span>
        )}
      </div>

      <div className="portfolio-summary__grid">
        {items.map(({ label, value }) => (
          <div className="summary-stat" key={label}>
            <span>{label}</span>
            <strong className={label === 'Unrealized P/L' && value != null
              ? value >= 0 ? 'value-positive' : 'value-negative'
              : ''}
            >
              {loading || value == null ? '—' : currencyFormatter.format(value)}
            </strong>
          </div>
        ))}
      </div>

      {!loading && portfolio?.marketDataStatus !== 'ready' && (
        <p className="data-note" role="status">
          Waiting for fresh prices before calculating position value and P/L.
        </p>
      )}
    </section>
  )
}

export default PortfolioSummary
