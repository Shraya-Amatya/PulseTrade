import { useCallback, useEffect, useState } from 'react'
import { fetchPortfolio, fetchTrades } from '../services/api.js'

function useDashboardData() {
  const [portfolio, setPortfolio] = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refresh = useCallback(() => {
    setReloadToken((currentToken) => currentToken + 1)
  }, [])

  useEffect(() => {
    let active = true

    Promise.all([fetchPortfolio(), fetchTrades()])
      .then(([portfolioData, tradesData]) => {
        if (!active) return
        setPortfolio(portfolioData)
        setTrades(tradesData.trades)
      })
      .catch(() => {
        if (active) setError('Unable to load portfolio data.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reloadToken])

  return { portfolio, trades, loading, error, refresh }
}

export default useDashboardData
