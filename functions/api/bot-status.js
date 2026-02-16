// Get bot status
export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    if (!env.DB) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { results } = await env.DB.prepare(`
      SELECT * FROM bot_status
    `).all();

    return Response.json({
      success: true,
      bots: results
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// Update bot status
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    if (!env.DB) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { bot_id, action, ...updates } = await request.json();

    if (action === 'start') {
      await env.DB.prepare(`
        UPDATE bot_status 
        SET is_active = 1, last_action = 'STARTED', last_action_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE bot_id = ?
      `).bind(Date.now(), bot_id).run();
    } else if (action === 'stop') {
      await env.DB.prepare(`
        UPDATE bot_status 
        SET is_active = 0, last_action = 'STOPPED', last_action_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE bot_id = ?
      `).bind(Date.now(), bot_id).run();
    }

    return Response.json({
      success: true,
      message: `Bot ${bot_id} ${action}ed`
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
