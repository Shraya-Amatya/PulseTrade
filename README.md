# PulseTrade

PulseTrade is a real-time simulated crypto trading dashboard built to demonstrate product engineering for trading-style interfaces. It receives live public market data from Binance, relays it through an Express server, and renders a focused React dashboard with a live BTC/USDT chart.

This is not a real exchange. It does not use real money, connect to wallets, execute blockchain transactions, or place real orders.

## Current status

The project currently includes:

- Vite + React JavaScript client
- Sass/SCSS styling foundation
- Express REST API
- PostgreSQL database with portfolio, positions, and trades tables
- Seeded demo portfolio with `$10,000`
- Binance BTCUSDT, ETHUSDT, and SOLUSDT trade streams
- Server-owned WebSocket relay at `ws://localhost:3000`
- Pair-scoped React market store
- Live Lightweight Charts line chart for BTC/USDT
- Live market ticker with session-based percentage changes
- Server-authoritative simulated market-order engine
- Atomic BUY/SELL updates across portfolio, positions, and trade history
- Live position valuation: current price, position value, and unrealized P/L
- Read-only EVM wallet connection for MetaMask/browser wallets
- Sepolia network detection, wrong-network guidance, and native balance display

The current trading engine supports simulated market orders through `POST /api/trades`.
Portfolio valuation is calculated by the server from PostgreSQL positions and the server-owned price cache. If an open position has no fresh price, total value and P/L are shown as unavailable instead of using stale data.

## Features

- Live BTC/USDT, ETH/USDT, and SOL/USDT prices
- Live BTC/USDT chart updated from the market WebSocket
- Demo account and portfolio summary
- Positions and trade-history views
- PostgreSQL-backed persistence
- WebSocket reconnect handling on the client and server
- Server-side market-data normalization
- Server-side price selection with five-second freshness validation
- Transaction-safe BUY/SELL execution with cash and holdings checks
- Wallet connection is intentionally read-only; this phase does not request signatures or transactions
- Responsive layout and keyboard-visible focus states

## Architecture

```text
Binance public WebSocket
          ↓
server/src/market/binanceClient.js
          ↓ normalized price events
server/src/market/priceCache.js
          ↓
server/src/market/marketHub.js
          ↓ ws://localhost:3000
client/src/stores/marketStore.js
          ├── MarketTicker
          └── PriceChart

React REST client
          ↓
Express API
          ↓
PostgreSQL
```

The browser never depends on Binance's raw event format. The server converts upstream events into the application contract:

```json
{
  "type": "price",
  "pair": "BTCUSDT",
  "price": 65000.12,
  "quantity": 0.001,
  "eventTime": 1710000000000,
  "tradeTime": 1710000000000
}
```

The React market store keeps updates pair-scoped. The chart receives price events through a focused subscription and batches visual updates every 250ms.

## Technology

- React and Vite
- JavaScript
- Sass/SCSS
- Wagmi, Viem, and TanStack Query for wallet state
- Node.js and Express
- `ws` WebSockets
- PostgreSQL and `pg`
- Docker Compose
- Lightweight Charts

## Run locally

Prerequisites:

- Node.js
- npm
- Docker Desktop

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Run the migration:

```bash
cd server
npm run db:migrate
```

Start the server in one terminal:

```bash
cd server
npm install
npm run dev
```

Start the client in another terminal:

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The server health endpoint is [http://localhost:3000/api/health](http://localhost:3000/api/health).

Docker PostgreSQL is mapped to host port `5433` because the default host port `5432` may already be used by another local PostgreSQL installation.

## Environment variables

Copy the relevant example file before configuring another environment:

- Root: [.env.example](./.env.example)
- Client: [client/.env.example](./client/.env.example)
- Server: [server/.env.example](./server/.env.example)

Client variables:

```text
VITE_API_URL
VITE_WS_URL
VITE_EVM_RPC_URL
```

Server variables:

```text
PORT
DATABASE_URL
NODE_ENV
CLIENT_ORIGIN
MARKET_PAIRS
WEBSOCKET_PATH
BINANCE_STREAM_URL
```

Docker Compose also reads `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` from the ignored root `.env` file.

Local `.env` files are ignored by Git. Never commit passwords, API keys, tokens, or production connection strings.

## API

```text
GET  /api/health
GET  /api/portfolio
GET  /api/trades?limit=50
POST /api/trades      # simulated market order
POST /api/trade       # compatibility alias
```

`POST /api/trades` accepts `{ "pair": "BTCUSDT", "side": "BUY", "quantity": "0.01" }`. The server ignores any client-supplied price and returns the server-selected execution price.

## Project structure

```text
client/
  src/
    components/
      Header/
      MarketTicker/
      PortfolioSummary/
      PositionsTable/
      PriceChart/
      TradeHistory/
      TradeTicket/
    hooks/
    pages/
    services/
    stores/
    styles/
server/
  src/
    api/
    db/
    market/
    services/
    config.js
    index.js
docker-compose.yml
MVP_REQUIREMENTS.md
```

## Known limitations

- There is one hardcoded demo account and no authentication.
- Trading is simulated only; there are no real orders or real-money balances.
- Wallet connection currently targets the Sepolia test network and reads native balance only.
- No wallet signatures, token approvals, contract calls, or blockchain trades are implemented.
- The chart starts collecting live data when the page connects; it does not load historical candles yet.
- Ticker percentages represent change during the current browser session, not Binance's 24-hour change.
- No order book, limit orders, stop-loss orders, wallet connection, or blockchain integration is included.
- Cloud deployment requires configuring Vercel and Railway services with their own environment variables.

## Deployment

The recommended production layout is:

```text
Vercel (client)
      ↓ HTTPS / WSS
Railway (Express server)
      ↓ private DATABASE_URL
Railway (PostgreSQL)
```

### Railway

1. Create a Railway project and add a PostgreSQL service.
2. Add the server as a service with `server` as its root directory.
3. Use `npm install` as the install step and `npm start` as the start command.
4. Configure `DATABASE_URL` from the Railway PostgreSQL service, plus `NODE_ENV=production`, `CLIENT_ORIGIN`, and optional market settings from `server/.env.example`.
5. Expose the server and verify `/api/health` returns `{ "status": "ok" }`.

### Vercel

1. Import the repository as a Vercel project with `client` as the root directory.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Set `VITE_API_URL` to the public Railway HTTPS URL.
4. Set `VITE_WS_URL` to the public Railway WebSocket URL using `wss://`.
5. Update Railway's `CLIENT_ORIGIN` to the exact Vercel URL and verify live prices, chart updates, and a simulated trade.

The application is prepared for deployment but is not deployed automatically from this repository. Provider account access, project creation, and production secrets must be supplied by the repository owner.

## Disclaimer

PulseTrade is an educational portfolio project and a simulated trading application. It does not use real money, provide financial advice, manage assets, connect to user wallets, or execute real trades. Market data is provided for demonstration purposes only.

See [MVP_REQUIREMENTS.md](./MVP_REQUIREMENTS.md) for the fixed product scope and acceptance criteria.
