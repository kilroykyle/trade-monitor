-- Cloudflare D1 Database Schema for Trade Monitor

-- Price snapshots from signal scraper
CREATE TABLE IF NOT EXISTS price_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price_usd REAL NOT NULL,
  market_cap REAL,
  volume_24h REAL,
  price_change_24h REAL,
  timestamp INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coin_timestamp ON price_snapshots(coin_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_symbol_timestamp ON price_snapshots(symbol, timestamp);

-- Trading signals generated
CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL, -- 'BUY', 'SELL', 'HOLD'
  price REAL NOT NULL,
  momentum REAL,
  confidence REAL,
  reason TEXT,
  timestamp INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signal_timestamp ON signals(timestamp DESC);

-- Bot trades (paper or real)
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL, -- 'BUY', 'SELL'
  price REAL NOT NULL,
  amount REAL NOT NULL,
  total_usd REAL NOT NULL,
  pnl REAL DEFAULT 0,
  is_paper_trade INTEGER DEFAULT 1, -- 1 = paper, 0 = real
  timestamp INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trade_timestamp ON trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bot_trades ON trades(bot_id, timestamp);

-- Bot status and state
CREATE TABLE IF NOT EXISTS bot_status (
  bot_id TEXT PRIMARY KEY,
  is_active INTEGER DEFAULT 0, -- 0 = stopped, 1 = running
  mode TEXT DEFAULT 'DRY_RUN', -- 'DRY_RUN' or 'LIVE'
  capital REAL DEFAULT 50.0,
  position_coin TEXT,
  position_amount REAL DEFAULT 0,
  position_entry_price REAL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_pnl REAL DEFAULT 0,
  last_action TEXT,
  last_action_time INTEGER,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default bot status
INSERT OR IGNORE INTO bot_status (bot_id, mode, capital) VALUES ('btc-momentum', 'DRY_RUN', 50.0);
INSERT OR IGNORE INTO bot_status (bot_id, mode, capital) VALUES ('signal-scraper', 'DRY_RUN', 0);

-- Kalshi markets (for prediction market monitoring)
CREATE TABLE IF NOT EXISTS kalshi_markets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_ticker TEXT NOT NULL UNIQUE,
  market_title TEXT NOT NULL,
  category TEXT,
  yes_price REAL,
  no_price REAL,
  volume REAL,
  last_check INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kalshi_ticker ON kalshi_markets(market_ticker);
