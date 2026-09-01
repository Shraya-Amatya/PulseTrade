import Dashboard from './pages/Dashboard.jsx'
import Header from './components/Header/Header.jsx'
import { useMarketStatus } from './hooks/useMarketPrices.js'

function App() {
  const status = useMarketStatus()

  return (
    <div className="app-shell">
      <Header status={status} />

      <main className="app-main">
        <Dashboard />
      </main>
    </div>
  )
}

export default App
