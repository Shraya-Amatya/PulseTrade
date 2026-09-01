import { lazy, Suspense } from 'react'
import MarketTicker from '../components/MarketTicker/MarketTicker.jsx'
import PortfolioSummary from '../components/PortfolioSummary/PortfolioSummary.jsx'
import PositionsTable from '../components/PositionsTable/PositionsTable.jsx'
import PriceChart from '../components/PriceChart/PriceChart.jsx'
import TradeHistory from '../components/TradeHistory/TradeHistory.jsx'
import TradeTicket from '../components/TradeTicket/TradeTicket.jsx'
import useDashboardData from '../hooks/useDashboardData.js'

const TokenSystem = lazy(() => import('../components/TokenSystem/TokenSystem.jsx'))
const SwapMechanics = lazy(() => import('../components/SwapMechanics/SwapMechanics.jsx'))
const LiquidityPool = lazy(() => import('../components/LiquidityPool/LiquidityPool.jsx'))
const DexExecution = lazy(() => import('../components/DexExecution/DexExecution.jsx'))
const BlockchainActivity = lazy(() => import('../components/BlockchainActivity/BlockchainActivity.jsx'))

function Dashboard() {
  const { portfolio, trades, loading, error, refresh } = useDashboardData()

  return (
    <div className="dashboard">
      <MarketTicker />

      {error && <p className="dashboard-alert" role="alert">{error}</p>}

      <div className="trading-workspace">
        <PriceChart />
        <TradeTicket onTrade={refresh} />
      </div>

      <Suspense fallback={<p className="dashboard-panel panel-loading">Loading blockchain tools…</p>}>
        <TokenSystem />
        <SwapMechanics />
        <LiquidityPool />
        <DexExecution />
        <BlockchainActivity />
      </Suspense>
      <PortfolioSummary portfolio={portfolio} loading={loading} />
      <PositionsTable positions={portfolio?.positions} loading={loading} />
      <TradeHistory trades={trades} loading={loading} />
    </div>
  )
}

export default Dashboard
