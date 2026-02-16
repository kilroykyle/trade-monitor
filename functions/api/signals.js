// Get latest trading signals
export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    if (!env.DB) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get latest 20 signals
    const { results } = await env.DB.prepare(`
      SELECT * FROM signals 
      ORDER BY timestamp DESC 
      LIMIT 20
    `).all();

    return Response.json({
      success: true,
      signals: results,
      count: results.length
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// Create new signal
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    if (!env.DB) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const signal = await request.json();
    const timestamp = Date.now();

    await env.DB.prepare(`
      INSERT INTO signals (coin_id, symbol, signal_type, price, momentum, confidence, reason, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      signal.coin_id,
      signal.symbol,
      signal.signal_type,
      signal.price,
      signal.momentum || 0,
      signal.confidence || 0,
      signal.reason || '',
      timestamp
    ).run();

    return Response.json({
      success: true,
      message: 'Signal created',
      timestamp
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
