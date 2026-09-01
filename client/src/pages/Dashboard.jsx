import MarketTicker from '../components/MarketTicker/MarketTicker.jsx'
import PortfolioSummary from '../components/PortfolioSummary/PortfolioSummary.jsx'
import PositionsTable from '../components/PositionsTable/PositionsTable.jsx'
import PriceChart from '../components/PriceChart/PriceChart.jsx'
import TradeHistory from '../components/TradeHistory/TradeHistory.jsx'
import TradeTicket from '../components/TradeTicket/TradeTicket.jsx'
import TokenSystem from '../components/TokenSystem/TokenSystem.jsx'
import SwapMechanics from '../components/SwapMechanics/SwapMechanics.jsx'
import useDashboardData from '../hooks/useDashboardData.js'

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

      <TokenSystem />
      <SwapMechanics />
      <PortfolioSummary portfolio={portfolio} loading={loading} />
      <PositionsTable positions={portfolio?.positions} loading={loading} />
      <TradeHistory trades={trades} loading={loading} />
    </div>
  )
}

export default Dashboard
