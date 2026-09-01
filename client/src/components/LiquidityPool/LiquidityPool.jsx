import { useMemo } from 'react'
import { useMarketPrice } from '../../hooks/useMarketPrices.js'
import { createDemoPool, DEMO_POOL_DEFAULTS } from '../../services/ammPool.js'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
})

function LiquidityPool() {
  const ethPrice = useMarketPrice('ETHUSDT')
  const pool = useMemo(() => createDemoPool(ethPrice), [ethPrice])

  return (
    <section className="dashboard-panel liquidity-pool" aria-labelledby="liquidity-pool-title">
      <div className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Phase 8 · AMM model</p>
          <h2 id="liquidity-pool-title">USDC / ETH liquidity pool</h2>
        </div>
        <span className="panel-status">x × y = k</span>
      </div>

      {!pool ? (
        <p className="empty-state">Waiting for ETH market data to initialize the demo pool.</p>
      ) : (
        <>
          <div className="pool-metrics">
            <div><span>USDC reserve</span><strong>{numberFormatter.format(pool.usdcReserve)} USDC</strong></div>
            <div><span>ETH reserve</span><strong>{numberFormatter.format(pool.ethReserve)} ETH</strong></div>
            <div><span>Pool liquidity</span><strong>{currencyFormatter.format(pool.liquidityUsd)}</strong></div>
            <div><span>Pool price</span><strong>{currencyFormatter.format(pool.priceUsd)} / ETH</strong></div>
            <div><span>Trading fee</span><strong>{(pool.feeBps / 100).toFixed(2)}%</strong></div>
            <div><span>Demo LP share</span><strong>{pool.lpSharePercent.toFixed(0)}%</strong></div>
          </div>
          <p className="data-note">This educational pool is recalculated from the live ETH/USDT price and uses {DEMO_POOL_DEFAULTS.ethReserve} ETH of modeled liquidity. It is not deployed on-chain and does not hold user funds.</p>
        </>
      )}
    </section>
  )
}

export default LiquidityPool
