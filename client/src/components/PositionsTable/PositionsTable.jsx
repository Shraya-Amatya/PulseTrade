const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function PositionsTable({ positions = [], loading }) {
  return (
    <section className="dashboard-panel data-section" aria-labelledby="positions-title" aria-busy={loading}>
      <div className="panel-heading">
        <h2 id="positions-title">Positions</h2>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Pair</th>
              <th scope="col">Quantity</th>
              <th scope="col">Average entry</th>
              <th scope="col">Current price</th>
              <th scope="col">Position value</th>
              <th scope="col">Unrealized P/L</th>
            </tr>
          </thead>
          <tbody>
            {loading && positions.length === 0 && (
              <tr><td colSpan="6">Loading positions…</td></tr>
            )}
            {positions.map((position) => (
              <tr key={position.pair}>
                <td>{position.pair}</td>
                <td>{position.quantity}</td>
                <td>{currencyFormatter.format(position.averageEntryPrice)}</td>
                <td>{position.currentPrice == null ? '—' : currencyFormatter.format(position.currentPrice)}</td>
                <td>{position.positionValue == null ? '—' : currencyFormatter.format(position.positionValue)}</td>
                <td className={position.unrealizedPnl == null
                  ? ''
                  : position.unrealizedPnl >= 0 ? 'value-positive' : 'value-negative'}
                >
                  {position.unrealizedPnl == null ? '—' : currencyFormatter.format(position.unrealizedPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && positions.length === 0 && (
        <p className="empty-state">No open positions. Your simulated holdings will appear here.</p>
      )}
    </section>
  )
}

export default PositionsTable
