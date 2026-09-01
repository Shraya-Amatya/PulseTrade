import { useSyncExternalStore } from 'react'
import {
  getChangeSnapshot,
  getChainSnapshot,
  getPriceSnapshot,
  getStatusSnapshot,
  subscribeToPrice,
  subscribeToChain,
  subscribeToStatus,
} from '../stores/marketStore.js'

export function useMarketPrice(pair) {
  return useSyncExternalStore(
    (listener) => subscribeToPrice(pair, listener),
    () => getPriceSnapshot(pair),
    () => null,
  )
}

export function useChainEvents() {
  return useSyncExternalStore(subscribeToChain, getChainSnapshot, () => ({
    status: 'disabled',
    latestBlock: null,
    swaps: [],
  }))
}

export function useMarketChange(pair) {
  return useSyncExternalStore(
    (listener) => subscribeToPrice(pair, listener),
    () => getChangeSnapshot(pair),
    () => 0,
  )
}

export function useMarketStatus() {
  return useSyncExternalStore(subscribeToStatus, getStatusSnapshot, () => 'connecting')
}
