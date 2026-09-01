import { useChainEvents } from '../../hooks/useMarketPrices.js'

function shorten(value) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '—'
}

function BlockchainActivity() {
  const { status, latestBlock, swaps } = useChainEvents()

  return (
    <section className="dashboard-panel blockchain-activity" aria-labelledby="blockchain-activity-title">
      <div className="panel-heading">
        <div><p className="panel-heading__eyebrow">Phase 12 · Normalized events</p><h2 id="blockchain-activity-title">Sepolia blockchain activity</h2></div>
        <span className="panel-status">{status}</span>
      </div>
      <div className="blockchain-activity__summary">
        <div><span>Latest block</span><strong>{latestBlock?.blockNumber || 'Waiting…'}</strong></div>
        <div><span>Event source</span><strong>Express WebSocket</strong></div>
      </div>
      {swaps.length > 0 ? (
        <div className="blockchain-activity__events">{swaps.map((swap) => <div key={`${swap.transactionHash}-${swap.logIndex}`}><span>Swap · block {swap.blockNumber}</span><a href={`https://sepolia.etherscan.io/tx/${swap.transactionHash}`} target="_blank" rel="noreferrer">{shorten(swap.transactionHash)} ↗</a></div>)}</div>
      ) : (
        <p className="data-note">No normalized pool swap events have arrived yet. Configure the server EVM stream to observe Sepolia blocks and watched Uniswap pools.</p>
      )}
    </section>
  )
}

export default BlockchainActivity
