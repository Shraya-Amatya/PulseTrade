function TradeTicket() {
  return (
    <section className="dashboard-panel trade-ticket" aria-labelledby="trade-ticket-title">
      <div className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Market order</p>
          <h2 id="trade-ticket-title">Trade ticket</h2>
        </div>
      </div>

      <div className="trade-ticket__side" aria-label="Order side preview">
        <button type="button" className="is-active" disabled>
          Buy
        </button>
        <button type="button" disabled>
          Sell
        </button>
      </div>

      <label className="field">
        <span>Pair</span>
        <select disabled defaultValue="BTCUSDT">
          <option value="BTCUSDT">BTC/USDT</option>
        </select>
      </label>

      <label className="field">
        <span>Quantity</span>
        <input type="number" placeholder="0.00" disabled />
      </label>

      <button className="trade-ticket__submit" type="button" disabled>
        Trading available in a later phase
      </button>
    </section>
  )
}

export default TradeTicket
