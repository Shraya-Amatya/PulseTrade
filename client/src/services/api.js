export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    const error = new Error(data?.error || `PulseTrade API request failed with status ${response.status}`)
    error.code = data?.code
    throw error
  }

  if (data == null) {
    throw new Error('PulseTrade API returned an invalid response.')
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

export function fetchMarketCandles(pair, { interval = '1m', limit = 120, signal } = {}) {
  const query = new URLSearchParams({
    pair,
    interval,
    limit: String(limit),
  })

  return request(`/api/market/candles?${query}`, { signal })
}
