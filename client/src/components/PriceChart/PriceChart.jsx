import { useEffect, useRef } from 'react'
import { createChart, LineSeries } from 'lightweight-charts'
import {
  getPriceEventSnapshot,
  subscribeToPrice,
} from '../../stores/marketStore.js'

const UPDATE_INTERVAL_MS = 250

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function PriceChart({ pair = 'BTCUSDT' }) {
  const chartContainerRef = useRef(null)
  const currentPriceRef = useRef(null)

  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return undefined

    const chart = createChart(container, {
      autoSize: true,
      height: 300,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#e2e8f0' },
        horzLines: { color: '#e2e8f0' },
      },
      rightPriceScale: { borderColor: '#d8dee7' },
      timeScale: { borderColor: '#d8dee7' },
    })
    const series = chart.addSeries(LineSeries, {
      color: '#2563eb',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    })

    let pendingEvent = getPriceEventSnapshot(pair)
    let updateTimer = null
    let lastTimestamp = 0

    const flushUpdate = () => {
      updateTimer = null
      if (!pendingEvent) return

      const event = pendingEvent
      pendingEvent = null
      const eventTimestamp = Math.floor(event.tradeTime / 1000)
      const timestamp = Math.max(eventTimestamp, lastTimestamp)

      series.update({ time: timestamp, value: event.price })
      lastTimestamp = timestamp
      currentPriceRef.current.textContent = priceFormatter.format(event.price)
    }

    const scheduleUpdate = (event) => {
      pendingEvent = event
      if (updateTimer == null) {
        updateTimer = window.setTimeout(flushUpdate, UPDATE_INTERVAL_MS)
      }
    }

    if (pendingEvent) {
      flushUpdate()
    }

    const unsubscribe = subscribeToPrice(pair, scheduleUpdate)
    const resizeObserver = new ResizeObserver(() => {
      chart.resize(container.clientWidth, 300)
    })
    resizeObserver.observe(container)

    return () => {
      unsubscribe()
      window.clearTimeout(updateTimer)
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [pair])

  return (
    <section className="dashboard-panel price-chart" aria-labelledby="chart-title">
      <div className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">{pair.slice(0, 3)}/{pair.slice(3)}</p>
          <h2 id="chart-title">Price chart</h2>
        </div>
        <strong ref={currentPriceRef}>Waiting for price</strong>
      </div>

      <div
        ref={chartContainerRef}
        className="price-chart__canvas"
        role="img"
        aria-label="Live BTC/USDT price chart"
      />
    </section>
  )
}

export default PriceChart
