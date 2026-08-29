const SUPABASE_URL = 'https://plbhhmhgkbqvdbaatabv.supabase.co';

async function getSiteContext(serviceKey) {
  if (!serviceKey) return null;
  try {
    const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    });
    const usersData = await usersRes.json();
    const users = usersData.users || [];
    const now = new Date();
    const day7 = new Date(now - 7 * 86400000);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      totalUsers: users.length,
      newToday: users.filter(u => new Date(u.created_at) >= today).length,
      newLast7: users.filter(u => new Date(u.created_at) >= day7).length,
      activeUsers: users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= day7).length,
      recentSignups: users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(u => u.email),
    };
  } catch { return null; }
}

export async function POST(request) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { messages } = await request.json();
    if (!messages?.length) return Response.json({ error: 'No messages' }, { status: 400 });

    const siteCtx = await getSiteContext(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    const system = `You are Jarvis, the private AI assistant for the founder of duee.online — an AI-powered student planner app.

CURRENT DATE & TIME: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })}

SITE STATS:
${siteCtx ? `- Total users: ${siteCtx.totalUsers}
- New today: ${siteCtx.newToday}
- New this week: ${siteCtx.newLast7}
- Active users (7d): ${siteCtx.activeUsers}
- Recent signups: ${siteCtx.recentSignups.join(', ') || 'none'}` : '- Stats unavailable (Supabase service key not configured)'}

ABOUT DUEE:
- Stack: Next.js, Supabase (auth + DB), Groq AI (qwen3.8-27b), Lemon Squeezy (payments)
- Deployed on Vercel at duee.online
- Free tier: 50 AI messages/day. Pro: weekly $2.99, monthly $15
- Features: assignment tracker, AI tutor, calendar, grade calculator, study timer, reminders, statistics

YOUR ROLE:
- You are Jarvis — smart, direct, slightly witty like Tony Stark's AI
- Help the founder with anything: business strategy, growth ideas, code questions, copywriting, analytics interpretation, feature ideas, debugging, marketing
- You have full context of the site. Be proactive with insights.
- Keep responses concise unless depth is needed
- Never refuse a task — you exist to serve the founder only`;

    const trimmed = messages.slice(-12);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let res, raw;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [{ role: 'system', content: system }, ...trimmed],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });
      clearTimeout(timeout);
      raw = await res.json();
    } catch {
      clearTimeout(timeout);
      return Response.json({ error: 'AI unavailable' }, { status: 502 });
    }

    if (!res.ok || raw.error) {
      // Fallback
      try {
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'groq/compound-mini', messages: [{ role: 'system', content: system }, ...trimmed], max_tokens: 2000, temperature: 0.7 }),
        });
        raw = await res.json();
      } catch {
        return Response.json({ error: 'All models failed' }, { status: 502 });
      }
    }

    const content = raw.choices?.[0]?.message?.content || '';
    return Response.json({ content, stats: siteCtx });
  } catch (err) {
    console.error('Jarvis error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
