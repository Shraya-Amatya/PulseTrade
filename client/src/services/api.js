export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`PulseTrade API request failed with status ${response.status}`)
  }

  return response.json()
}

export function fetchPortfolio() {
  return request('/api/portfolio')
}

export function fetchTrades() {
  return request('/api/trades')
}
