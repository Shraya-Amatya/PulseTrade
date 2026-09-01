export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.error || `PulseTrade API request failed with status ${response.status}`)
    error.code = data.code
    throw error
  }

  return data
}

export function fetchPortfolio() {
  return request('/api/portfolio')
}

export function fetchTrades() {
  return request('/api/trades')
}

export function submitTrade({ pair, side, quantity }) {
  return request('/api/trades', {
    method: 'POST',
    body: JSON.stringify({ pair, side, quantity }),
  })
}
