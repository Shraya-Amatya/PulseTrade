function TradeHistory({ trades = [], loading }) {
  return (
    <section className="dashboard-panel data-section" aria-labelledby="history-title" aria-busy={loading}>
      <div className="panel-heading">
        <h2 id="history-title">Trade history</h2>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Pair</th>
              <th scope="col">Side</th>
              <th scope="col">Quantity</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            {loading && trades.length === 0 && (
              <tr><td colSpan="5">Loading trade history…</td></tr>
            )}
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td>{new Date(trade.createdAt).toLocaleString()}</td>
                <td>{trade.pair}</td>
                <td>{trade.side}</td>
                <td>{trade.quantity}</td>
                <td>${trade.executionPrice.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && trades.length === 0 && (
        <p className="empty-state">No simulated trades yet.</p>
      )}
    </section>
  )
}

export default TradeHistory
