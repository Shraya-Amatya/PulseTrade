# PulseTrade

PulseTrade is a real-time simulated crypto trading dashboard built to demonstrate product engineering for trading-style interfaces. It receives live public market data from Binance, relays it through an Express server, and renders a focused React dashboard with a live BTC/USDT chart.

This is not a real exchange. It does not use real money or place real trading orders. The optional wallet section can read balances, approve tokens, and execute supported testnet swaps on Sepolia after explicit wallet confirmation.

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
- EVM wallet connection for MetaMask/browser wallets
- Sepolia network detection, wrong-network guidance, and native balance display
- Sepolia ERC-20 metadata and wallet-balance reads for USDC and WETH
- ERC-20 allowance reads and exact-amount approval transactions
- Transaction hash links, confirmation handling, and failed/reverted transaction states
- Simulation-only USDC → WETH swap quote mechanics: slippage, minimum received, price impact, fee, gas preview, and deadline
- Transparent USDC/ETH constant-product demo pool with reserves, liquidity, price, fee, and modeled LP share
- Testnet Uniswap v3 execution path with direct-pool discovery, on-chain quotes, allowance gating, gas simulation, swap submission, receipt states, explorer links, and local transaction history
- Direct route comparison across Uniswap v3 0.05%, 0.30%, and 1.00% fee tiers with best-output selection
- Express/WebSocket blockchain event bridge with normalized Sepolia block and Uniswap pool-swap events

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
- Testnet token approvals are available for USDC and WETH
- Swap mechanics include a transparent AMM preview model and a separate testnet Uniswap v3 execution path
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

Sepolia RPC/WebSocket
          ↓ normalized block and swap events
Express blockchain event bridge
          ↓ PulseTrade WebSocket
React blockchain activity store
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

Blockchain events are normalized before they reach the browser. Examples:

```json
{
  "type": "block",
  "network": "sepolia",
  "blockNumber": "12345678",
  "observedAt": 1710000000000
}
```

```json
{
  "type": "chain_swap",
  "network": "sepolia",
  "pool": "0x…",
  "transactionHash": "0x…",
  "blockNumber": "12345678",
  "amount0": "-1000000",
  "amount1": "400000000000000",
  "observedAt": 1710000000000
}
```

Wallet and token data follows a separate on-chain path:

```text
React wallet/token UI
          ↓
Wagmi + Viem
          ↓
Sepolia RPC and ERC-20 contracts
```

The client reads token metadata, balances, and allowances from Sepolia. Approval requests are sent only after an explicit user action, use the exact amount entered in the form, and expose the submitted transaction hash and receipt status. The approval target defaults to the testnet Uniswap SwapRouter02 because it is the spender used by the executable swap panel.

The swap preview uses the live ETH/USDT market price, a documented constant-product demo pool, and a simulated router gas limit to make execution tradeoffs visible. The executable panel uses direct Uniswap v3 testnet contracts.

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
VITE_USDC_ADDRESS
VITE_WETH_ADDRESS
VITE_APPROVAL_SPENDER_ADDRESS
VITE_UNISWAP_V3_FACTORY_ADDRESS
VITE_UNISWAP_V3_QUOTER_ADDRESS
VITE_SWAP_ROUTER_ADDRESS
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
EVM_RPC_URL
EVM_WS_URL
EVM_POOL_ADDRESSES
```

Docker Compose also reads `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` from the ignored root `.env` file.

Local `.env` files are ignored by Git. Never commit passwords, API keys, tokens, or production connection strings.

### Sepolia contract defaults

The client includes public testnet defaults for the supported flow. Every address can be overridden through the client environment variables above:

```text
USDC             0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
WETH             0xfff9976782d46cc05630d1f6ebab18b2324d6b14
Uniswap Factory  0x0227628f3F023bb0B980b67D528571c95c6DaC1c
QuoterV2         0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3
SwapRouter02     0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
```

The Uniswap deployment mappings are documented in the [official Ethereum deployments reference](https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments).

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
      TokenSystem/
      SwapMechanics/
      LiquidityPool/
      DexExecution/
    hooks/
    pages/
    services/
    config/
    stores/
    styles/
server/
  src/
    api/
    chain/
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
- Wallet and token interactions currently target the Sepolia test network only.
- USDC and WETH balances/allowances are read from configurable token contracts; approval writes use the configured SwapRouter02 spender by default.
- No mainnet interaction is implemented.
- The Phase 8 pool display remains a local educational model; the Phase 9 executable path uses Uniswap v3 testnet contracts.
- Blockchain activity is live only when the server has `EVM_RPC_URL` or `EVM_WS_URL` and watched addresses in `EVM_POOL_ADDRESSES`; missing configuration is reported as disabled.
- The chart starts collecting live data when the page connects; it does not load historical candles yet.
- Ticker percentages represent change during the current browser session, not Binance's 24-hour change.
- No order book, limit orders, stop-loss orders, multi-hop routing, or mainnet blockchain interaction is included.
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

PulseTrade is an educational portfolio project and a simulated trading application. It does not use real money or place real trading orders. Wallet interactions are optional and limited to public Sepolia reads, explicit approvals, and supported testnet swaps; users pay testnet gas and remain responsible for wallet confirmation. Market data and quotes are provided for demonstration purposes only.

See [MVP_REQUIREMENTS.md](./MVP_REQUIREMENTS.md) for the fixed product scope and acceptance criteria.
