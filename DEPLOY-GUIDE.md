# 🚀 trade.kylekilroy.com Deployment Guide

Complete setup in 10 minutes. Follow these steps exactly.

---

## Step 1: Create D1 Database (2 min)

Open terminal in this directory and run:

```bash
cd /home/kilroy/.openclaw/workspace/trade.kylekilroy.com

# Create database
npx wrangler d1 create trade-monitor
```

**Copy the output!** You'll see something like:
```
database_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Save that database_id** - you'll need it in Step 3.

---

## Step 2: Initialize Database Schema (1 min)

```bash
# Apply schema to database
npx wrangler d1 execute trade-monitor --file=schema.sql
```

This creates the tables for:
- Price history
- Trading signals
- Trades log
- Bot status

---

## Step 3: Deploy to Cloudflare Pages (3 min)

1. Go to https://dash.cloudflare.com/ → **Workers & Pages**

2. Click **Create application** → **Pages** → **Connect to Git**

3. Select repository: **`kilroykyle/trade-monitor`**

4. Configure:
   - **Project name**: `trade-monitor`
   - **Production branch**: `main`
   - **Build command**: (leave empty)
   - **Build output directory**: `/`

5. Click **Save and Deploy**

6. Wait ~30 seconds for first deploy

---

## Step 4: Bind D1 Database (2 min)

**Critical step - dashboard won't work without this!**

1. In your Pages project, click **Settings** tab

2. In left sidebar, click **Functions**

3. Scroll down to **D1 database bindings**

4. Click **Add binding**

5. Fill in:
   - **Variable name**: `DB` (must be exactly DB)
   - **D1 database**: Select `trade-monitor` from dropdown

6. Click **Save**

7. Click **Redeploy** button at top to activate binding

---

## Step 5: Add Custom Domain (1 min)

1. Still in project settings, click **Custom domains**

2. Click **Set up a custom domain**

3. Enter: `trade.kylekilroy.com`

4. Click **Continue**

5. Cloudflare auto-creates DNS record

6. Wait ~30 seconds for SSL certificate

---

## Step 6: Test the Dashboard (1 min)

1. Open https://trade.kylekilroy.com

2. You should see:
   - Header with "Trade Monitor"
   - Stats cards (all zeros initially)
   - Empty price chart
   - Empty signal feed
   - Bot controls

3. Click "Test Signal" button - you should see a signal appear

4. If you see "Database not configured" error:
   - Go back to Step 4
   - Make sure binding is named exactly `DB`
   - Redeploy the project

---

## Step 7: Start Signal Scraper (Optional - manual for now)

Run this locally to populate price data:

```bash
cd /home/kilroy/.openclaw/workspace/trade.kylekilroy.com
node signal-scraper.js
```

This will:
- Fetch BTC, ETH, SOL, AVAX, LINK prices
- Store in D1 database
- Takes ~5 seconds

**Note:** Cron automation coming in Phase 2

---

## ✅ You're Done!

**Dashboard is live at:** https://trade.kylekilroy.com

### What works now:
- ✅ Live dashboard UI
- ✅ API endpoints (/api/signals, /api/prices, etc.)
- ✅ D1 database storage
- ✅ Test signal generation
- ✅ Bot status display

### Coming next (manual setup):
- Signal scraper automation (cron)
- BTC bot integration
- Discord alerts
- Real-time price updates

---

## Troubleshooting

### "Database not configured" error
**Fix:** Go to Pages project → Settings → Functions → D1 database bindings → Add `DB` binding → Redeploy

### Empty price chart
**Fix:** Run signal scraper manually: `node signal-scraper.js`

### Bots show as "inactive"
**Expected:** Bots aren't running yet. That's Phase 2.

### Can't access dashboard
**Fix:** Check custom domain was added. May take 1-2 minutes for DNS propagation.

---

## Next Steps

**Phase 2 (Manual Setup):**
1. Set up OpenClaw cron for signal scraper (every 5 min)
2. Test BTC momentum bot in DRY RUN
3. Add Discord webhook for alerts
4. Monitor for 24-48 hours

**Phase 3 (Go Live):**
1. If bots perform well in paper trading
2. Enable real trading (change DRY_RUN to false)
3. Start with $50 max
4. Monitor closely

---

## Quick Reference

**Dashboard:** https://trade.kylekilroy.com

**GitHub:** https://github.com/kilroykyle/trade-monitor

**Database:** `trade-monitor` (D1)

**Binding:** `DB` (must be exact)

**APIs:**
- GET /api/signals - Latest signals
- GET /api/prices?symbol=BTC&hours=24 - Price history
- GET /api/bot-status - Bot state
- GET /api/trades?limit=50 - Trade history

---

**Questions?** Check README.md or ask Rocket.

**Built by Rocket AI 🚀**
