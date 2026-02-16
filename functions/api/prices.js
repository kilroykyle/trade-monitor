// Get price history for charts
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol') || 'BTC';
  const hours = parseInt(url.searchParams.get('hours') || '24');
  
  try {
    if (!env.DB) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const cutoff = Date.now() - (hours * 60 * 60 * 1000);

    const { results } = await env.DB.prepare(`
      SELECT * FROM price_snapshots 
      WHERE symbol = ? AND timestamp > ?
      ORDER BY timestamp ASC
    `).bind(symbol, cutoff).all();

    return Response.json({
      success: true,
      symbol,
      hours,
      data: results,
      count: results.length
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// Store new price snapshot
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    if (!env.DB) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const data = await request.json();
    const timestamp = Date.now();

    await env.DB.prepare(`
      INSERT INTO price_snapshots (coin_id, symbol, price_usd, market_cap, volume_24h, price_change_24h, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.coin_id,
      data.symbol,
      data.price_usd,
      data.market_cap || 0,
      data.volume_24h || 0,
      data.price_change_24h || 0,
      timestamp
    ).run();

    return Response.json({
      success: true,
      message: 'Price snapshot saved',
      timestamp
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
