BEGIN;

CREATE TABLE IF NOT EXISTS portfolio (
  id INTEGER PRIMARY KEY,
  cash_balance NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id INTEGER NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
  pair VARCHAR(20) NOT NULL,
  quantity NUMERIC(30, 12) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  average_entry_price NUMERIC(30, 12) NOT NULL DEFAULT 0 CHECK (average_entry_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (portfolio_id, pair)
);

CREATE TABLE IF NOT EXISTS trades (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id INTEGER NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
  pair VARCHAR(20) NOT NULL,
  side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity NUMERIC(30, 12) NOT NULL CHECK (quantity > 0),
  execution_price NUMERIC(30, 12) NOT NULL CHECK (execution_price > 0),
  notional_value NUMERIC(30, 12) NOT NULL CHECK (notional_value > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trades_portfolio_created_at_idx
  ON trades (portfolio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS positions_portfolio_pair_idx
  ON positions (portfolio_id, pair);

INSERT INTO portfolio (id, cash_balance)
VALUES (1, 10000.00000000)
ON CONFLICT (id) DO NOTHING;

COMMIT;
