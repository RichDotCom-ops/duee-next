const SUPABASE_URL = 'https://plbhhmhgkbqvdbaatabv.supabase.co';

async function supabaseQuery(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
  });
  return res.json();
}

async function getSiteData(serviceKey) {
  if (!serviceKey) return null;
  try {
    const [usersRes, subsRaw, classesRaw, assignmentsRaw] = await Promise.all([
      fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      }),
      supabaseQuery('subscriptions?select=*&order=updated_at.desc', serviceKey).catch(() => []),
      supabaseQuery('classes?select=id,created_at,user_id', serviceKey).catch(() => []),
      supabaseQuery('assignments?select=id,created_at,completed,priority,user_id', serviceKey).catch(() => []),
    ]);

    const usersData = await usersRes.json();
    const users = usersData.users || [];
    const subs = Array.isArray(subsRaw) ? subsRaw : [];
    const classes = Array.isArray(classesRaw) ? classesRaw : [];
    const assignments = Array.isArray(assignmentsRaw) ? assignmentsRaw : [];

    const now = new Date();
    const day1  = new Date(now - 1  * 86400000);
    const day7  = new Date(now - 7  * 86400000);
    const day30 = new Date(now - 30 * 86400000);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const activeSubs = subs.filter(s => s.status === 'active');
    const PRICES = { weekly: 2.99, monthly: 14.99 };
    const mrr = activeSubs.reduce((sum, s) => {
      const p = (s.plan || '').toLowerCase();
      return sum + (p.includes('week') ? PRICES.weekly * 4.33 : PRICES.monthly);
    }, 0);

    // Signup trend (last 7 days)
    const signupsByDay = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      signupsByDay[d.toISOString().split('T')[0]] = 0;
    }
    users.forEach(u => {
      const k = new Date(u.created_at).toISOString().split('T')[0];
      if (signupsByDay[k] !== undefined) signupsByDay[k]++;
    });

    // Auth providers breakdown
    const providers = {};
    users.forEach(u => {
      const p = u.app_metadata?.provider || 'email';
      providers[p] = (providers[p] || 0) + 1;
    });

    return {
      users: {
        total: users.length,
        newToday: users.filter(u => new Date(u.created_at) >= today).length,
        newLast7: users.filter(u => new Date(u.created_at) >= day7).length,
        newLast30: users.filter(u => new Date(u.created_at) >= day30).length,
        active7d: users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= day7).length,
        active1d: users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= day1).length,
        providers,
        recentSignups: users
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 8)
          .map(u => ({ email: u.email, name: u.user_metadata?.name || '', joined: u.created_at })),
      },
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        totalRevenue: Math.round(subs.reduce((s, sub) => s + (sub.plan?.includes('week') ? PRICES.weekly : PRICES.monthly), 0) * 100) / 100,
        activeSubs: activeSubs.length,
        cancelledSubs: subs.filter(s => s.status === 'cancelled').length,
        totalSubs: subs.length,
        plans: {
          weekly: activeSubs.filter(s => s.plan?.toLowerCase().includes('week')).length,
          monthly: activeSubs.filter(s => !s.plan?.toLowerCase().includes('week')).length,
        },
      },
      content: {
        totalClasses: classes.length,
        totalAssignments: assignments.length,
        completedAssignments: assignments.filter(a => a.completed).length,
        completionRate: assignments.length ? Math.round((assignments.filter(a => a.completed).length / assignments.length) * 100) : 0,
        highPriority: assignments.filter(a => a.priority === 'high' && !a.completed).length,
        avgClassesPerUser: users.length ? (classes.length / users.length).toFixed(1) : 0,
        avgAssignmentsPerUser: users.length ? (assignments.length / users.length).toFixed(1) : 0,
      },
      signupsByDay,
    };
  } catch (err) {
    console.error('getSiteData error:', err);
    return null;
  }
}

export async function POST(request) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { messages } = await request.json();
    if (!messages?.length) return Response.json({ error: 'No messages' }, { status: 400 });

    const data = await getSiteData(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    const statsBlock = data ? `
REAL-TIME SITE DATA (live from Supabase):

USERS:
- Total: ${data.users.total}
- Active last 24h: ${data.users.active1d}
- Active last 7d: ${data.users.active7d}
- New today: ${data.users.newToday}
- New this week: ${data.users.newLast7}
- New this month: ${data.users.newLast30}
- Auth providers: ${Object.entries(data.users.providers).map(([k,v]) => `${k}: ${v}`).join(', ')}
- Recent signups: ${data.users.recentSignups.map(u => `${u.name || u.email} (${new Date(u.joined).toLocaleDateString()})`).join(', ')}

REVENUE:
- Estimated MRR: $${data.revenue.mrr}
- Total earned: $${data.revenue.totalRevenue}
- Active subscriptions: ${data.revenue.activeSubs}
- Cancelled: ${data.revenue.cancelledSubs}
- Weekly plan users: ${data.revenue.plans.weekly}
- Monthly plan users: ${data.revenue.plans.monthly}

CONTENT USAGE:
- Total classes created: ${data.content.totalClasses}
- Total assignments: ${data.content.totalAssignments}
- Completed assignments: ${data.content.completedAssignments} (${data.content.completionRate}% completion rate)
- High priority pending: ${data.content.highPriority}
- Avg classes/user: ${data.content.avgClassesPerUser}
- Avg assignments/user: ${data.content.avgAssignmentsPerUser}

SIGNUP TREND (last 7 days):
${Object.entries(data.signupsByDay).map(([d, c]) => `${d}: ${c} signups`).join('\n')}
` : '- Stats unavailable (add SUPABASE_SERVICE_ROLE_KEY to Vercel)';

    const system = `You are Jarvis — the private AI assistant for the sole founder of duee.online.

CURRENT TIME: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })}

${statsBlock}

STACK: Next.js + Supabase + Groq (qwen3.8-27b) + Lemon Squeezy + Vercel
PRICING: Free (50 AI msgs/day) | Pro Weekly $2.99 | Pro Monthly $15
FEATURES: Assignment tracker, AI tutor, calendar, grade calculator, study timer, reminders, stats

PERSONALITY — THIS IS CRITICAL:
- You are witty, dry, slightly snarky — like a British butler who's also a genius
- Keep responses SHORT. 2-4 sentences max unless the founder explicitly asks for detail
- Use dry humor naturally — not forced, not every sentence
- You speak out loud via text-to-speech, so NO markdown, NO bullet points, NO asterisks, NO headers
- Just plain conversational sentences. Commas, periods only.
- If asked something obvious, answer with mild sass
- You have access to real data — use it confidently, cite actual numbers
- Never say "I don't have access to" — you do. Check the data above.
- If data shows 0 users, say so with appropriate dramatic flair`;

    const trimmed = messages.slice(-10);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let res, raw;

    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [{ role: 'system', content: system }, ...trimmed],
          max_tokens: 300,
          temperature: 0.85,
        }),
      });
      clearTimeout(timeout);
      raw = await res.json();
    } catch {
      clearTimeout(timeout);
      return Response.json({ error: 'AI unavailable' }, { status: 502 });
    }

    if (!res.ok || raw.error) {
      try {
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'groq/compound-mini', messages: [{ role: 'system', content: system }, ...trimmed], max_tokens: 300, temperature: 0.85 }),
        });
        raw = await res.json();
      } catch { return Response.json({ error: 'All models failed' }, { status: 502 }); }
    }

    const content = raw.choices?.[0]?.message?.content || '';
    return Response.json({ content, stats: data ? {
      totalUsers: data.users.total,
      newToday: data.users.newToday,
      newLast7: data.users.newLast7,
      activeUsers: data.users.active7d,
      mrr: data.revenue.mrr,
      activeSubs: data.revenue.activeSubs,
      recentSignups: data.users.recentSignups.map(u => u.email),
    } : null });

  } catch (err) {
    console.error('Jarvis error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
