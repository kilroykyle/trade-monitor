// Get trade history
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  
  try {
    if (!env.DB) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { results } = await env.DB.prepare(`
      SELECT * FROM trades 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).bind(limit).all();

    // Calculate stats
    const stats = results.length > 0 ? {
      total_trades: results.length,
      total_pnl: results.reduce((sum, t) => sum + (t.pnl || 0), 0),
      winning_trades: results.filter(t => t.pnl > 0).length,
      losing_trades: results.filter(t => t.pnl < 0).length,
      win_rate: results.filter(t => t.pnl > 0).length / results.length * 100
    } : {
      total_trades: 0,
      total_pnl: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0
    };

    return Response.json({
      success: true,
      trades: results,
      stats
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// Record new trade
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    if (!env.DB) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const trade = await request.json();
    const timestamp = Date.now();

    await env.DB.prepare(`
      INSERT INTO trades (bot_id, coin_id, symbol, trade_type, price, amount, total_usd, pnl, is_paper_trade, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      trade.bot_id,
      trade.coin_id,
      trade.symbol,
      trade.trade_type,
      trade.price,
      trade.amount,
      trade.total_usd,
      trade.pnl || 0,
      trade.is_paper_trade ? 1 : 0,
      timestamp
    ).run();

    // Update bot stats
    await env.DB.prepare(`
      UPDATE bot_status 
      SET total_trades = total_trades + 1,
          winning_trades = winning_trades + CASE WHEN ? > 0 THEN 1 ELSE 0 END,
          total_pnl = total_pnl + ?,
          last_action = ?,
          last_action_time = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE bot_id = ?
    `).bind(trade.pnl || 0, trade.pnl || 0, trade.trade_type, timestamp, trade.bot_id).run();

    return Response.json({
      success: true,
      message: 'Trade recorded',
      timestamp
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
