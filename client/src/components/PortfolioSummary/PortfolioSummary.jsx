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
    <section className="dashboard-panel portfolio-summary" aria-labelledby="portfolio-title">
      <div className="panel-heading">
        <h2 id="portfolio-title">Portfolio</h2>
      </div>

      <div className="portfolio-summary__grid">
        {items.map(({ label, value }) => (
          <div className="summary-stat" key={label}>
            <span>{label}</span>
            <strong>{loading || value == null ? '—' : currencyFormatter.format(value)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export default PortfolioSummary
