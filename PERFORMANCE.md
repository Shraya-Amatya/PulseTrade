# Performance baseline

This is a local baseline for PulseTrade, recorded on 2026-09-01 during development. It is a measurement snapshot, not a production SLO.

## Measurements

- `GET /api/health`: 25.60 ms average across 20 local requests; 5.22–380.30 ms observed.
- `GET /api/portfolio`: 25.51 ms average across 20 local requests; 7.62–313.14 ms observed.
- Market WebSocket: 263 messages over 5.047 seconds, or 52.11 messages per second from the local relay.
- Sepolia `getBlockNumber`: 1,196.70 ms for one public RPC request.
- Sepolia Uniswap QuoterV2: 501.18 ms for one 0.30% USDC/WETH quote for 1 USDC.
- Server memory: 84.25 MB working set for the local Node process listening on port 3000.
- Initial client chunk: 464.41 kB, or 144.26 kB gzip, from the Vite production build.
- Largest lazy blockchain chunk: 42.79 kB, or 14.79 kB gzip, from the Vite production build.

## Current decisions

- Market ticks are delivered through a small external store and pair-scoped subscriptions.
- The chart batches visual updates instead of repainting for every upstream tick.
- Wallet, token, swap, and blockchain activity surfaces are lazy-loaded so the initial dashboard chunk stays below Vite's 500 kB warning threshold.
- Blockchain reads are client-side request/response operations; normalized live block and pool-swap events use the Express WebSocket bridge.
- Quote selection compares the supported Uniswap v3 fee tiers and chooses the highest-output available route.

## Follow-up measurements

React render frequency, chart repaint frequency, production browser load timing, and memory under sustained production traffic still need browser-profiler/load-test runs after deployment. The public Sepolia RPC timings vary with provider load and network conditions.
