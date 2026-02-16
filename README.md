## 📊 Trade Monitor - Live Signal Dashboard

**Live at:** https://trade.kylekilroy.com (after deployment)

Real-time crypto trading dashboard with live signals, bot management, and performance tracking.

---

## Features

### 🎯 Live Signal Feed
- Real-time buy/sell/hold signals
- Confidence scores and momentum indicators
- Price alerts and notifications

### 📈 Price Charts
- 24-hour BTC price history
- Interactive hover details
- Auto-refresh every 30 seconds

### 🤖 Bot Management
- **BTC Momentum Bot** - $50 automated trading (DRY RUN default)
- **Signal Scraper** - Price monitoring every 5 minutes
- Start/stop controls
- Live status indicators

### 📜 Trade History
- Complete trade log
- P&L tracking
- Win rate calculation
- Paper trading by default

### 📊 Dashboard Stats
- Total capital
- Total P&L
- Win rate
- Active signals
- Total trades

---

## Tech Stack

- **Frontend:** HTML/CSS/JS (vanilla, responsive)
- **Backend:** Cloudflare Pages Functions
- **Database:** Cloudflare D1 (SQLite)
- **Bots:** Node.js scripts (signal-scraper.js, btc-bot.js)
- **Cron:** Cloudflare Cron Triggers (every 5 min)
- **Hosting:** Cloudflare Pages

---

## Deployment

### 1. Create D1 Database

```bash
# Create database
npx wrangler d1 create trade-monitor

# Note the database_id from output
# database_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2. Initialize Database Schema

```bash
# Apply schema
npx wrangler d1 execute trade-monitor --file=schema.sql
```

### 3. Create Cloudflare Pages Project

1. Go to https://dash.cloudflare.com/ → **Workers & Pages**
2. **Create application** → **Pages** → **Connect to Git**
3. Select repository: `kilroykyle/trade-monitor`
4. Production branch: `main`
5. Build settings: Leave empty (static site)
6. Click **Save and Deploy**

### 4. Bind D1 Database

1. Go to project **Settings** → **Functions**
2. Scroll to **D1 database bindings**
3. Click **Add binding**
   - Variable name: `DB`
   - D1 database: Select `trade-monitor`
4. Click **Save**

### 5. Add Custom Domain

1. Project settings → **Custom domains**
2. Add `trade.kylekilroy.com`
3. DNS auto-configured

### 6. Set Up Cron Jobs

Create cron triggers for automation:

#### Signal Scraper (Every 5 minutes)
```bash
npx wrangler pages deployment create trade-monitor --cron "*/5 * * * *"
```

Or via OpenClaw cron:
```javascript
{
  "name": "Signal Scraper",
  "schedule": { "kind": "every", "everyMs": 300000 }, // 5 min
  "payload": {
    "kind": "agentTurn",
    "message": "Run signal scraper: node /home/kilroy/.openclaw/workspace/trade.kylekilroy.com/signal-scraper.js"
  },
  "sessionTarget": "isolated"
}
```

---

## Bot Configuration

### Signal Scraper (`signal-scraper.js`)

Tracks 5 coins via CoinGecko API:
- BTC, ETH, SOL, AVAX, LINK

**Run manually:**
```bash
cd /home/kilroy/.openclaw/workspace/trade.kylekilroy.com
node signal-scraper.js
```

**Auto-run via cron:** Every 5 minutes

**Output:** Writes to D1 database (price_snapshots table)

---

### BTC Momentum Bot (`btc-bot.js`)

**Strategy:**
- Check BTC price every 15 minutes
- Buy if momentum up >0.5%
- Sell if momentum down >0.5%
- Otherwise hold

**Risk Management:**
- Max capital: $50
- Position size: $25 per trade
- Stop loss: 5% (max $10 loss)
- Take profit: 3%

**Default Mode:** DRY RUN (paper trading)

**Run manually:**
```bash
node btc-bot.js
```

**Enable real trading:**
Edit `btc-bot.js`, line ~20:
```javascript
DRY_RUN: false  // Change to false
```

---

## API Endpoints

All APIs use Cloudflare Pages Functions:

### GET /api/signals
Get latest 20 trading signals

**Response:**
```json
{
  "success": true,
  "signals": [
    {
      "id": 1,
      "symbol": "BTC",
      "signal_type": "BUY",
      "price": 98543.21,
      "momentum": 2.5,
      "confidence": 85,
      "timestamp": 1708058400000
    }
  ]
}
```

### GET /api/prices?symbol=BTC&hours=24
Get price history for charts

### GET /api/bot-status
Get status of all bots

### POST /api/bot-status
Start/stop bots
```json
{
  "bot_id": "btc-momentum",
  "action": "start"
}
```

### GET /api/trades?limit=50
Get trade history with stats

### POST /api/trades
Record new trade
```json
{
  "bot_id": "btc-momentum",
  "coin_id": "bitcoin",
  "symbol": "BTC",
  "trade_type": "BUY",
  "price": 98543.21,
  "amount": 0.000254,
  "total_usd": 25.00,
  "pnl": 0,
  "is_paper_trade": true
}
```

---

## Database Schema

See `schema.sql` for complete schema.

**Tables:**
- `price_snapshots` - Price history
- `signals` - Trading signals
- `trades` - Trade log
- `bot_status` - Bot state and stats
- `kalshi_markets` - Prediction market data

---

## Security

### API Protection
- No authentication required (personal dashboard)
- Can add Cloudflare Access for enterprise SSO
- Can restrict by IP if needed

### Bot Safety
- DRY RUN by default (paper trading)
- Strict capital limits ($50 max)
- Stop loss protection (5%)
- Kill switch available

### Credentials
- Coinbase API: `.private/coinbase-bot-api.txt` (not in repo)
- Kalshi keys: `.openclaw/credentials/` (not in repo)
- GitHub token: `.openclaw/credentials/` (not in repo)

---

## Monitoring

### Dashboard Metrics
- Capital: $50.00 (starting)
- Total P&L: Updated on each trade
- Win Rate: % of profitable trades
- Total Trades: All trades (paper + real)
- Active Signals: Current buy/sell/hold count

### Alerts (Future)
- Discord webhook on trades
- WhatsApp daily summary
- Email on big wins/losses

---

## Troubleshooting

### "Database not configured"
- Verify D1 binding in Pages settings
- Variable name must be `DB`
- Redeploy after adding binding

### Bots not running
- Check cron job status
- Run manually first: `node signal-scraper.js`
- Check Cloudflare Workers logs

### No price data
- Signal scraper needs to run first
- Takes 5 minutes to populate
- Check CoinGecko API limits (free tier: 30 req/min)

---

## Roadmap

### Phase 1 (Tonight) ✅
- [x] Dashboard UI
- [x] API endpoints
- [x] D1 database schema
- [x] Signal scraper migration
- [x] BTC bot migration

### Phase 2 (This Week)
- [ ] Deploy to Cloudflare Pages
- [ ] Set up cron automation
- [ ] Test paper trading
- [ ] Add Kalshi integration
- [ ] Discord alerts

### Phase 3 (Later)
- [ ] Multiple coin support
- [ ] Advanced charting
- [ ] Strategy backtesting
- [ ] Real trading (after testing)
- [ ] Subscription service ($10-50/mo)

---

## Files

```
trade.kylekilroy.com/
├── index.html              # Dashboard UI
├── schema.sql              # D1 database schema
├── signal-scraper.js       # Price monitoring bot
├── btc-bot.js              # Trading bot
├── functions/
│   └── api/
│       ├── signals.js      # Signal feed API
│       ├── prices.js       # Price data API
│       ├── bot-status.js   # Bot control API
│       └── trades.js       # Trade history API
└── README.md               # This file
```

---

## Questions?

Check the dashboard at https://trade.kylekilroy.com or ask Kyle/Rocket.

**Built by Rocket AI 🚀**
