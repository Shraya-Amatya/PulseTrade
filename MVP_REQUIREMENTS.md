# PulseTrade MVP Requirements

## Product definition

PulseTrade is a public, recruiter-ready simulated crypto trading dashboard. It uses real-time Binance market prices, but no real money, wallets, blockchain transactions, or exchange accounts are involved.

The MVP should feel like a trustworthy trading terminal while clearly communicating that all trading is simulated.

## Primary user

The primary user is a visitor evaluating the product as a working demonstration of product engineering, frontend performance, real-time systems, and backend reliability.

The visitor must be able to understand the product within one minute and complete a simulated trade without setup or authentication.

## Core user journey

1. The user opens the dashboard.
2. The dashboard shows that it is connected to live market data.
3. The user sees live BTC/USDT, ETH/USDT, and SOL/USDT prices.
4. The user selects a pair and sees its live chart.
5. The user sees a starting demo cash balance of `$10,000.00`.
6. The user enters a quantity and submits a simulated BUY or SELL market order.
7. The server executes the trade at the latest trusted market price.
8. The user sees a success or error message.
9. The portfolio balance, position, value, and profit/loss update.
10. The completed trade appears in trade history.
11. The user refreshes the browser and sees the same persisted portfolio and trade history.

## In scope

### Market data

- Live prices for BTC/USDT, ETH/USDT, and SOL/USDT.
- Binance public WebSocket as the upstream market-data source.
- Express server as the only market-data connection used by the browser.
- Server-side normalization and broadcast of price events.
- WebSocket connection status in the dashboard.
- Automatic upstream reconnect after disconnects.
- Clear stale-data behavior when the server cannot confirm a current price.

### Trading

- One hardcoded demo portfolio.
- Starting cash balance of `$10,000.00`.
- Market-order simulation only.
- BUY and SELL actions.
- Server-determined execution price.
- Validation for supported pairs, positive quantities, available cash, and available holdings.
- Atomic persistence of each valid trade and its portfolio changes.

### Portfolio

- Cash balance.
- Current holdings by pair.
- Current market value.
- Average entry price.
- Unrealized profit/loss.
- Total portfolio value.
- Persistence across browser refreshes and server restarts.

### Dashboard

- Live market ticker.
- Live chart for at least one pair.
- Trading ticket.
- Portfolio summary.
- Positions table.
- Trade history table.
- Loading, empty, success, error, disconnected, and stale-price states.
- Responsive layout for desktop and mobile widths.
- Keyboard-accessible controls and visible focus states.

### Delivery

- Publicly accessible deployed client.
- Publicly accessible deployed server/API.
- Production WebSocket connection verified.
- README containing the product description, architecture diagram, setup instructions, API examples, screenshots, live URL, and known limitations.

## Explicitly out of scope

Do not implement these in the MVP:

- User accounts, login, signup, or password management.
- Multiple users or isolated portfolios.
- Real wallets or blockchain transactions.
- Deposits, withdrawals, or real-money payments.
- Limit orders, stop-loss orders, or other advanced order types.
- Order-book depth visualization.
- Real exchange order execution.
- Notifications, chat, social trading, or admin tools.
- Mobile-native applications.

## Product rules

- The interface must visibly label the account and orders as simulated/demo trading.
- The client must never be trusted to provide the execution price.
- A trade cannot execute without a current server-side market price.
- A failed trade must not partially update the portfolio.
- Monetary values and quantities must preserve decimal precision.
- Live market updates must not cause the entire dashboard to rerender on every raw tick.
- A temporary market-data disconnect must be visible and recoverable.
- The app must remain useful while historical trade data is empty.

## MVP acceptance criteria

The MVP is accepted only when all statements below are true:

- A fresh visitor can open the public app without authentication.
- At least three market prices visibly update in real time.
- At least one chart visibly updates from live market data.
- The demo portfolio starts with exactly `$10,000.00` cash.
- A valid BUY reduces cash and creates or increases a position.
- A valid SELL reduces a position and increases cash.
- Invalid trades return a clear error and leave the portfolio unchanged.
- The execution price shown in history comes from the server’s current market cache.
- Portfolio value and unrealized P/L reflect the latest available market prices.
- A completed trade appears in history without a full-page reload.
- Refreshing the browser preserves the portfolio and trade history.
- WebSocket disconnect and reconnect states are visible to the user.
- The deployed app works on desktop and mobile-sized screens.
- The README explains that this is not a real exchange and documents the architecture.

## Engineering signals to demonstrate

The implementation should make these decisions visible in the README and demo:

- Why the server sits between Binance and the browser.
- How high-frequency events are normalized, cached, and throttled for UI rendering.
- How database transactions prevent inconsistent cash, positions, and trades.
- How stale prices and reconnects are handled.
- How accessibility and responsive behavior were considered.
- What was intentionally excluded from the MVP and why.

## Definition of done for Phase 0

Phase 0 is complete when this document is treated as the fixed MVP contract. Any new feature must either replace an existing requirement or be explicitly marked as post-MVP before implementation begins.
