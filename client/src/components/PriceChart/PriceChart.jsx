import { useEffect, useRef, useState } from 'react'
import { ColorType, createChart, LineSeries } from 'lightweight-charts'
import { fetchMarketCandles } from '../../services/api.js'
import {
  getPriceEventSnapshot,
  subscribeToPrice,
} from '../../stores/marketStore.js'
import { useMarketStatus } from '../../hooks/useMarketPrices.js'

const UPDATE_INTERVAL_MS = 250
const CHART_HEIGHT = 300
const HISTORY_LIMIT = 300

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatPair(pair) {
  return pair.endsWith('USDT') ? `${pair.slice(0, -4)}/USDT` : pair
}

function getChartStatusLabel(historyStatus, marketStatus) {
  if (historyStatus === 'loading') return 'Loading history…'
  if (marketStatus === 'connected') return historyStatus === 'unavailable' ? 'Live only' : 'Live'

  return {
    stale: 'Feed stale',
    reconnecting: 'Reconnecting…',
    waiting: 'Waiting for prices…',
    error: 'Connection error',
    disconnected: 'Disconnected',
  }[marketStatus] || 'Connecting…'
}

function PriceChart({ pair = 'BTCUSDT' }) {
  const chartContainerRef = useRef(null)
  const currentPriceRef = useRef(null)
  const [historyStatus, setHistoryStatus] = useState('loading')
  const marketStatus = useMarketStatus()

  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return undefined

    const chart = createChart(container, {
      width: Math.max(container.clientWidth, 1),
      height: CHART_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#eef1f5' },
        horzLines: { color: '#eef1f5' },
      },
      rightPriceScale: { borderColor: '#d8dee7' },
      timeScale: {
        borderColor: '#d8dee7',
        rightOffset: 5,
        timeVisible: true,
        secondsVisible: true,
        shiftVisibleRangeOnNewBar: true,
      },
    })
    const series = chart.addSeries(LineSeries, {
      color: '#2563eb',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    })
    const abortController = new AbortController()
    let pendingEvent = getPriceEventSnapshot(pair)
    let updateTimer = null
    let lastTimestamp = 0
    let pointCount = 0
    let chartPoints = []
    let historyReady = false
    let disposed = false

    const updateMetadata = (event) => {
      container.dataset.chartStatus = 'live'
      container.dataset.lastPrice = String(event.price)
      container.dataset.lastUpdate = String(event.tradeTime)
      container.dataset.pointCount = String(pointCount)
      if (currentPriceRef.current) {
        currentPriceRef.current.textContent = priceFormatter.format(event.price)
      }
    }

    const flushUpdate = () => {
      updateTimer = null
      if (!pendingEvent || !historyReady || disposed) return

      const event = pendingEvent
      pendingEvent = null
      const eventTimestamp = Math.floor(event.tradeTime / 1000)
      const timestamp = Math.max(eventTimestamp, lastTimestamp)
      const isNewPoint = timestamp > lastTimestamp

      const point = { time: timestamp, value: event.price }

      if (isNewPoint) {
        chartPoints.push(point)
        if (chartPoints.length > HISTORY_LIMIT) {
          chartPoints = chartPoints.slice(-HISTORY_LIMIT)
          series.setData(chartPoints)
        } else {
          series.update(point)
        }
      } else {
        chartPoints[chartPoints.length - 1] = point
        series.update(point)
      }

      lastTimestamp = timestamp
      pointCount = chartPoints.length
      updateMetadata(event)

      if (isNewPoint) chart.timeScale().scrollToRealTime()
    }

    const scheduleUpdate = (event) => {
      pendingEvent = event
      if (!historyReady || updateTimer != null) return
      updateTimer = window.setTimeout(flushUpdate, UPDATE_INTERVAL_MS)
    }

    const unsubscribe = subscribeToPrice(pair, scheduleUpdate)
    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return
      chart.resize(Math.max(container.clientWidth, 1), CHART_HEIGHT)
    })
    resizeObserver.observe(container)

    async function loadHistory() {
      setHistoryStatus('loading')
      container.dataset.chartStatus = 'loading'

      try {
        const response = await fetchMarketCandles(pair, {
          interval: '1s',
          limit: HISTORY_LIMIT,
          signal: abortController.signal,
        })
        if (disposed) return

        chartPoints = response.candles
          .map((candle) => ({ time: candle.time, value: candle.close }))
          .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))

        series.setData(chartPoints)
        lastTimestamp = chartPoints.at(-1)?.time || 0
        pointCount = chartPoints.length
        container.dataset.pointCount = String(pointCount)
        historyReady = true
        setHistoryStatus('ready')
        chart.timeScale().fitContent()
      } catch (error) {
        if (error.name === 'AbortError' || disposed) return

        historyReady = true
        container.dataset.chartStatus = 'live-only'
        setHistoryStatus('unavailable')
      }

      if (pendingEvent) scheduleUpdate(pendingEvent)
    }

    if (pendingEvent && currentPriceRef.current) {
      currentPriceRef.current.textContent = priceFormatter.format(pendingEvent.price)
    }
    loadHistory()

    return () => {
      disposed = true
      abortController.abort()
      unsubscribe()
      window.clearTimeout(updateTimer)
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [pair])

  const chartStatusLabel = getChartStatusLabel(historyStatus, marketStatus)
  const isLive = marketStatus === 'connected' && historyStatus !== 'loading'

  return (
    <section className="dashboard-panel price-chart" aria-labelledby="chart-title">
      <div className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">{formatPair(pair)} · 5 minute live window</p>
          <h2 id="chart-title">Price chart</h2>
        </div>
        <div className="price-chart__summary">
          <strong ref={currentPriceRef}>Waiting for price</strong>
          <span className={`price-chart__status${isLive ? ' price-chart__status--live' : ''}`} role="status">
            <span aria-hidden="true">●</span> {chartStatusLabel}
          </span>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="price-chart__canvas"
        role="img"
        aria-label={`Live ${formatPair(pair)} price chart`}
      />

      {historyStatus === 'unavailable' && (
        <p className="price-chart__note" role="status">
          Historical data is unavailable. Live prices will continue plotting as they arrive.
        </p>
      )}
    </section>
  )
}

export default PriceChart
