const SUPPORTED_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

const state = {
  events: {},
  openingPrices: {},
  changes: {},
  chain: {
    status: 'disabled',
    latestBlock: null,
    swaps: [],
  },
  status: 'connecting',
}

const priceListeners = new Map()
const statusListeners = new Set()
const chainListeners = new Set()
let socket = null
let reconnectTimer = null
let reconnectAttempt = 0
let started = false

function notifyPrice(pair, event) {
  for (const listener of priceListeners.get(pair) || []) {
    listener(event)
  }
}

function notifyStatus() {
  for (const listener of statusListeners) {
    listener()
  }
}

function notifyChain() {
  for (const listener of chainListeners) listener()
}

function setStatus(status) {
  state.status = status
  notifyStatus()
}

function handleMessage(rawMessage) {
  const message = JSON.parse(rawMessage)

  if (message.type === 'chain_connection') {
    state.chain = { ...state.chain, status: message.status }
    notifyChain()
    return
  }

  if (message.type === 'chain_error') {
    state.chain = { ...state.chain, status: 'error' }
    notifyChain()
    return
  }

  if (message.type === 'block') {
    state.chain = { ...state.chain, status: 'connected', latestBlock: message }
    notifyChain()
    return
  }

  if (message.type === 'chain_swap') {
    state.chain = {
      ...state.chain,
      status: 'connected',
      swaps: [message, ...state.chain.swaps].slice(0, 5),
    }
    notifyChain()
    return
  }

  if (message.type === 'connection' && message.status) {
    setStatus(message.status)
    return
  }

  if (
    message.type !== 'price' ||
    !SUPPORTED_PAIRS.includes(message.pair) ||
    !Number.isFinite(message.price)
  ) {
    return
  }

  if (!state.openingPrices[message.pair]) {
    state.openingPrices[message.pair] = message.price
  }

  state.events[message.pair] = message
  state.changes[message.pair] =
    ((message.price - state.openingPrices[message.pair]) /
      state.openingPrices[message.pair]) *
    100

  notifyPrice(message.pair, message)
}

function scheduleReconnect() {
  if (reconnectTimer || !started) return

  const delay = Math.min(1000 * 2 ** reconnectAttempt, 10000)
  reconnectAttempt += 1
  setStatus('reconnecting')
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

function connect() {
  if (!started || (socket && socket.readyState <= 1)) return

  setStatus('connecting')
  socket = new WebSocket(WEBSOCKET_URL)

  socket.addEventListener('open', () => {
    reconnectAttempt = 0
    setStatus('connecting')
  })

  socket.addEventListener('message', (event) => {
    try {
      handleMessage(event.data)
    } catch {
      setStatus('error')
    }
  })

  socket.addEventListener('close', () => {
    socket = null
    scheduleReconnect()
  })

  socket.addEventListener('error', () => {
    setStatus('error')
  })
}

export function startMarketStore() {
  if (started) return
  started = true
  connect()
}

export function subscribeToPrice(pair, listener) {
  startMarketStore()

  if (!priceListeners.has(pair)) {
    priceListeners.set(pair, new Set())
  }

  priceListeners.get(pair).add(listener)
  return () => priceListeners.get(pair)?.delete(listener)
}

export function subscribeToStatus(listener) {
  startMarketStore()
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

export function getPriceSnapshot(pair) {
  return state.events[pair]?.price ?? null
}

export function getChangeSnapshot(pair) {
  return state.changes[pair] ?? 0
}

export function getPriceEventSnapshot(pair) {
  return state.events[pair] || null
}

export function getStatusSnapshot() {
  return state.status
}

export function subscribeToChain(listener) {
  startMarketStore()
  chainListeners.add(listener)
  return () => chainListeners.delete(listener)
}

export function getChainSnapshot() {
  return state.chain
}
