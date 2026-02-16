#!/usr/bin/env node
/**
 * Signal Scraper v1 - CoinGecko Price Monitor
 * Fetches crypto prices every 5 minutes and stores in SQLite
 */

const Database = require('better-sqlite3');
const axios = require('axios');
const path = require('path');

// Configuration
const DB_PATH = path.join(__dirname, 'signals.db');
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Tracked coins (start small, expand later)
const TRACKED_COINS = [
  { id: 'bitcoin', symbol: 'BTC', tier: 'A' },
  { id: 'ethereum', symbol: 'ETH', tier: 'A' },
  { id: 'solana', symbol: 'SOL', tier: 'B' },
  { id: 'avalanche-2', symbol: 'AVAX', tier: 'B' },
  { id: 'chainlink', symbol: 'LINK', tier: 'B' }
];

// Initialize database
function initDB() {
  const db = new Database(DB_PATH);
  
  // Create tables
  db.exec(`
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
  `);
  
  return db;
}

// Fetch prices from CoinGecko
async function fetchPrices() {
  const coinIds = TRACKED_COINS.map(c => c.id).join(',');
  
  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: coinIds,
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true
      },
      timeout: 10000
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ CoinGecko API error:', error.message);
    return null;
  }
}

// Store prices in database
function storePrices(db, priceData) {
  const timestamp = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(`
    INSERT INTO price_snapshots (coin_id, symbol, price_usd, market_cap, volume_24h, price_change_24h, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  let stored = 0;
  
  for (const coin of TRACKED_COINS) {
    const data = priceData[coin.id];
    if (!data) continue;
    
    stmt.run(
      coin.id,
      coin.symbol,
      data.usd || 0,
      data.usd_market_cap || 0,
      data.usd_24h_vol || 0,
      data.usd_24h_change || 0,
      timestamp
    );
    stored++;
  }
  
  return stored;
}

// Generate signals from price data
function detectSignals(db) {
  // Simple signal: >5% move in 24h
  const signals = db.prepare(`
    SELECT 
      symbol,
      price_usd,
      price_change_24h,
      timestamp
    FROM price_snapshots
    WHERE timestamp = (SELECT MAX(timestamp) FROM price_snapshots)
      AND ABS(price_change_24h) > 5.0
    ORDER BY ABS(price_change_24h) DESC
  `).all();
  
  return signals;
}

// Main execution
async function main() {
  console.log('🚀 Signal Scraper v1 - Starting...');
  
  // Initialize database
  const db = initDB();
  console.log('✅ Database initialized');
  
  // Fetch prices
  console.log('📡 Fetching prices from CoinGecko...');
  const prices = await fetchPrices();
  
  if (!prices) {
    console.error('❌ Failed to fetch prices');
    process.exit(1);
  }
  
  // Store prices
  const stored = storePrices(db, prices);
  console.log(`💾 Stored ${stored} price snapshots`);
  
  // Detect signals
  const signals = detectSignals(db);
  
  if (signals.length > 0) {
    console.log(`\n🚨 SIGNALS DETECTED (${signals.length}):`);
    signals.forEach(s => {
      const direction = s.price_change_24h > 0 ? '📈' : '📉';
      console.log(`  ${direction} ${s.symbol}: ${s.price_change_24h.toFixed(2)}% (24h) - $${s.price_usd.toFixed(2)}`);
    });
  } else {
    console.log('✅ No major moves detected (>5% threshold)');
  }
  
  // Show recent history
  const recentCount = db.prepare('SELECT COUNT(*) as count FROM price_snapshots').get();
  console.log(`\n📊 Database: ${recentCount.count} total snapshots`);
  
  db.close();
  console.log('✅ Scraper cycle complete\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, initDB, fetchPrices };
