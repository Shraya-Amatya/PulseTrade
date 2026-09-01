function PositionsTable({ positions = [], loading }) {
  return (
    <section className="dashboard-panel data-section" aria-labelledby="positions-title">
      <div className="panel-heading">
        <h2 id="positions-title">Positions</h2>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Quantity</th>
              <th>Average entry</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.pair}>
                <td>{position.pair}</td>
                <td>{position.quantity}</td>
                <td>${position.averageEntryPrice.toLocaleString('en-US')}</td>
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
