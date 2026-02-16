// $50 BTC Momentum Trading Bot
// Simple momentum strategy with strict risk management
// For Kyle Kilroy - Educational/Fun Trading

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// CONFIG
const CONFIG = {
  MAX_CAPITAL: 50,           // $50 total budget
  MAX_LOSS_PER_TRADE: 10,    // Max $10 loss per trade
  POSITION_SIZE: 25,         // $25 per trade (50% of capital)
  STOP_LOSS_PERCENT: 5,      // 5% stop loss
  TAKE_PROFIT_PERCENT: 3,    // 3% take profit
  MOMENTUM_PERIOD: 15,       // 15 minute momentum check
  DRY_RUN: true             // Paper trading mode
};

// Load Coinbase API credentials
function loadCredentials() {
  const path = require('path');
  const credsPath = path.join(__dirname, '../.private/coinbase-bot-api.txt');
  const credsRaw = fs.readFileSync(credsPath, 'utf8');
  
  const keyNameMatch = credsRaw.match(/API Key Name: (.*)/);
  const privateKeyMatch = credsRaw.match(/-----BEGIN EC PRIVATE KEY-----([\s\S]*?)-----END EC PRIVATE KEY-----/);
  
  return {
    keyName: keyNameMatch[1].trim(),
    privateKey: `-----BEGIN EC PRIVATE KEY-----${privateKeyMatch[1]}-----END EC PRIVATE KEY-----`
  };
}

// Create JWT for Coinbase API
function createJWT(method, path, privateKey, keyName) {
  const algorithm = 'ES256';
  const uri = `${method} api.coinbase.com${path}`;
  
  const header = {
    alg: algorithm,
    kid: keyName,
    nonce: crypto.randomBytes(16).toString('hex'),
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: keyName,
    iss: "cdp",
    nbf: now,
    exp: now + 120,
    uri: uri
  };

  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const message = `${encHeader}.${encPayload}`;

  const sign = crypto.createSign('SHA256');
  sign.update(message);
  sign.end();
  
  const signature = sign.sign(privateKey, 'base64url');
  
  return `${message}.${signature}`;
}

// Make Coinbase API request
async function coinbaseRequest(method, path, body = null) {
  const creds = loadCredentials();
  const jwt = createJWT(method, path, creds.privateKey, creds.keyName);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.coinbase.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Get current BTC price
async function getBTCPrice() {
  try {
    const data = await coinbaseRequest('GET', '/api/v3/brokerage/products/BTC-USD');
    return parseFloat(data.price);
  } catch (error) {
    console.error('Error fetching BTC price:', error.message);
    return null;
  }
}

// Check momentum (simple: compare current price to 15min ago)
function checkMomentum(priceHistory) {
  if (priceHistory.length < 2) return 'HOLD';
  
  const current = priceHistory[priceHistory.length - 1];
  const past = priceHistory[0];
  const change = ((current - past) / past) * 100;
  
  if (change > 0.5) return 'BUY';   // Price up >0.5% in 15min
  if (change < -0.5) return 'SELL'; // Price down >0.5% in 15min
  return 'HOLD';
}

// Bot state (persisted to file)
let state = {
  capital: CONFIG.MAX_CAPITAL,
  position: null,
  totalProfit: 0,
  totalTrades: 0,
  wins: 0,
  losses: 0,
  priceHistory: [],
  lastCheck: null,
  active: true
};

// Load state from file
function loadState() {
  try {
    if (fs.existsSync('../.private/bot-state.json')) {
      state = JSON.parse(fs.readFileSync('../.private/bot-state.json', 'utf8'));
    }
  } catch (error) {
    console.log('Starting with fresh state');
  }
}

// Save state to file
function saveState() {
  fs.writeFileSync('../.private/bot-state.json', JSON.stringify(state, null, 2));
}

// Execute trade (simulated for now)
async function executeTrade(action, price) {
  if (CONFIG.DRY_RUN) {
    console.log(`[DRY RUN] ${action} BTC at $${price}`);
    return true;
  }
  
  // Real trading would use Coinbase Advanced Trade API
  // For safety: DRY_RUN mode only for now
  console.log(`[WOULD TRADE] ${action} BTC at $${price}`);
  return true;
}

// Main bot logic
async function runBot() {
  console.log('\n🤖 BTC Momentum Bot Running...');
  console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN (SIMULATED)' : 'LIVE TRADING'}`);
  console.log(`Capital: $${state.capital}`);
  console.log(`Total P&L: $${state.totalProfit.toFixed(2)}\n`);
  
  if (!state.active) {
    console.log('❌ Bot is DISABLED. Enable in state file to resume.');
    return;
  }

  try {
    // Get current BTC price
    const price = await getBTCPrice();
    if (!price) {
      console.log('⚠️  Could not fetch BTC price. Skipping this cycle.');
      return;
    }

    console.log(`📊 Current BTC Price: $${price.toFixed(2)}`);
    
    // Add to price history
    state.priceHistory.push(price);
    if (state.priceHistory.length > 15) {
      state.priceHistory.shift(); // Keep last 15 data points
    }

    // Check if we have a position
    if (state.position) {
      const entry = state.position.entryPrice;
      const change = ((price - entry) / entry) * 100;
      
      console.log(`💼 Position: ${state.position.size} BTC @ $${entry.toFixed(2)}`);
      console.log(`📈 Current P&L: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
      
      // Check stop loss
      if (change <= -CONFIG.STOP_LOSS_PERCENT) {
        console.log('🛑 STOP LOSS TRIGGERED!');
        await executeTrade('SELL', price);
        
        const loss = (price - entry) * state.position.size;
        state.capital += (state.position.size * price);
        state.totalProfit += loss;
        state.losses++;
        state.totalTrades++;
        state.position = null;
        
        console.log(`❌ Loss: $${loss.toFixed(2)}`);
      }
      
      // Check take profit
      else if (change >= CONFIG.TAKE_PROFIT_PERCENT) {
        console.log('✅ TAKE PROFIT TRIGGERED!');
        await executeTrade('SELL', price);
        
        const profit = (price - entry) * state.position.size;
        state.capital += (state.position.size * price);
        state.totalProfit += profit;
        state.wins++;
        state.totalTrades++;
        state.position = null;
        
        console.log(`💰 Profit: $${profit.toFixed(2)}`);
      }
    } else {
      // No position - check momentum
      const signal = checkMomentum(state.priceHistory);
      console.log(`📡 Momentum Signal: ${signal}`);
      
      if (signal === 'BUY' && state.capital >= CONFIG.POSITION_SIZE) {
        console.log('🟢 BUY SIGNAL!');
        
        const btcAmount = CONFIG.POSITION_SIZE / price;
        await executeTrade('BUY', price);
        
        state.position = {
          entryPrice: price,
          size: btcAmount,
          timestamp: Date.now()
        };
        state.capital -= CONFIG.POSITION_SIZE;
        
        console.log(`✅ Bought ${btcAmount.toFixed(6)} BTC @ $${price.toFixed(2)}`);
      }
    }

    // Save state
    state.lastCheck = new Date().toISOString();
    saveState();

    // Print summary
    console.log('\n📊 Bot Summary:');
    console.log(`Capital: $${state.capital.toFixed(2)}`);
    console.log(`Total Trades: ${state.totalTrades}`);
    console.log(`Win Rate: ${state.totalTrades > 0 ? ((state.wins / state.totalTrades) * 100).toFixed(1) : 0}%`);
    console.log(`Total P&L: ${state.totalProfit >= 0 ? '+' : ''}$${state.totalProfit.toFixed(2)}`);
    console.log(`Next Check: ${new Date(Date.now() + CONFIG.MOMENTUM_PERIOD * 60000).toLocaleTimeString()}`);

  } catch (error) {
    console.error('❌ Bot Error:', error.message);
  }
}

// Kill switch check
function checkKillSwitch() {
  if (fs.existsSync('../.private/bot-killswitch.txt')) {
    console.log('\n🚨 KILL SWITCH ACTIVATED! Bot stopped.');
    state.active = false;
    saveState();
    process.exit(0);
  }
}

// Main loop
async function main() {
  console.log('🚀 BTC Momentum Bot v1.0');
  console.log('Built for Kyle Kilroy - Educational Trading\n');
  
  loadState();
  
  // Run immediately
  await runBot();
  
  // Then run every 15 minutes
  setInterval(async () => {
    checkKillSwitch();
    await runBot();
  }, CONFIG.MOMENTUM_PERIOD * 60000);
}

// Start bot
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runBot, state };
