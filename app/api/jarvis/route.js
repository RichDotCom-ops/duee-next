const SUPABASE_URL = 'https://plbhhmhgkbqvdbaatabv.supabase.co';

async function sq(path, key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  const d = await res.json();
  return Array.isArray(d) ? d : [];
}

async function getSiteData(key) {
  if (!key) return null;
  try {
    const [usersRes, subs, classes, assignments] = await Promise.all([
      fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
      }),
      sq('subscriptions?select=*&order=updated_at.desc', key).catch(() => []),
      sq('classes?select=id,created_at,user_id,name', key).catch(() => []),
      sq('assignments?select=id,created_at,completed,priority,user_id,due_date,name,class_id', key).catch(() => []),
    ]);

    const usersData = await usersRes.json();
    const users = usersData.users || [];

    const now = new Date();
    const day1   = new Date(now - 1  * 86400000);
    const day7   = new Date(now - 7  * 86400000);
    const day30  = new Date(now - 30 * 86400000);
    const today  = new Date(); today.setHours(0,0,0,0);
    const week   = new Date(); week.setHours(0,0,0,0); week.setDate(week.getDate() + 7);

    // ── Users ──────────────────────────────────────────────────────────────
    const providers = {};
    users.forEach(u => {
      const p = u.app_metadata?.provider || 'email';
      providers[p] = (providers[p] || 0) + 1;
    });

    const signupsByDay = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      signupsByDay[d.toISOString().split('T')[0]] = 0;
    }
    users.forEach(u => {
      const k = new Date(u.created_at).toISOString().split('T')[0];
      if (signupsByDay[k] !== undefined) signupsByDay[k]++;
    });

    const active7d = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= day7).length;
    const active1d = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= day1).length;

    // ── Subscriptions & Revenue ────────────────────────────────────────────
    const activeSubs = subs.filter(s => s.status === 'active');
    const cancelledSubs = subs.filter(s => s.status === 'cancelled');
    const PRICES = { weekly: 2.99, monthly: 14.99 };

    const mrr = activeSubs.reduce((sum, s) => {
      const p = (s.plan || '').toLowerCase();
      return sum + (p.includes('week') ? PRICES.weekly * 4.33 : PRICES.monthly);
    }, 0);

    const weeklySubCount  = activeSubs.filter(s => s.plan?.toLowerCase().includes('week')).length;
    const monthlySubCount = activeSubs.filter(s => !s.plan?.toLowerCase().includes('week')).length;

    // Conversion rate: paying users / total users
    const payingUserIds = new Set(activeSubs.map(s => s.user_id).filter(Boolean));
    const conversionRate = users.length ? ((payingUserIds.size / users.length) * 100).toFixed(1) : 0;

    // Churn: cancelled in last 30 days
    const recentChurn = cancelledSubs.filter(s => new Date(s.updated_at) >= day30).length;

    // Revenue momentum: MRR growth proxy (new subs last 7d vs 7d before that)
    const day14 = new Date(now - 14 * 86400000);
    const newSubsLast7  = subs.filter(s => s.status === 'active' && new Date(s.created_at) >= day7).length;
    const newSubsPrev7  = subs.filter(s => s.status === 'active' && new Date(s.created_at) >= day14 && new Date(s.created_at) < day7).length;

    // ── Content & Engagement ───────────────────────────────────────────────
    const completed   = assignments.filter(a => a.completed);
    const pending     = assignments.filter(a => !a.completed);
    const overdue     = pending.filter(a => a.due_date && new Date(a.due_date) < today);
    const dueToday    = pending.filter(a => a.due_date && new Date(a.due_date).toDateString() === today.toDateString());
    const dueThisWeek = pending.filter(a => a.due_date && new Date(a.due_date) >= today && new Date(a.due_date) <= week);
    const highPriority = pending.filter(a => a.priority === 'high');
    const completionRate = assignments.length ? Math.round((completed.length / assignments.length) * 100) : 0;

    // Users with most activity
    const userClassCount = {};
    classes.forEach(c => { userClassCount[c.user_id] = (userClassCount[c.user_id] || 0) + 1; });
    const powerUsers = users
      .filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= day7)
      .sort((a, b) => (userClassCount[b.id] || 0) - (userClassCount[a.id] || 0))
      .slice(0, 3)
      .map(u => u.user_metadata?.name || u.email?.split('@')[0] || 'user');

    // Per-user averages
    const avgClasses     = users.length ? (classes.length / users.length).toFixed(1) : 0;
    const avgAssignments = users.length ? (assignments.length / users.length).toFixed(1) : 0;

    // Day-of-week signup analysis (which day gets most signups)
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const signupsByWeekday = Array(7).fill(0);
    users.forEach(u => { signupsByWeekday[new Date(u.created_at).getDay()]++; });
    const peakDay = days[signupsByWeekday.indexOf(Math.max(...signupsByWeekday))];

    // Hour-of-day for recent signups
    const signupHours = Array(24).fill(0);
    users.filter(u => new Date(u.created_at) >= day30).forEach(u => { signupHours[new Date(u.created_at).getHours()]++; });
    const peakHour = signupHours.indexOf(Math.max(...signupHours));

    // Retention: users who signed up 7d+ ago and were active in last 7d
    const oldEnough = users.filter(u => new Date(u.created_at) <= day7);
    const retentionRate = oldEnough.length
      ? Math.round((oldEnough.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= day7).length / oldEnough.length) * 100)
      : 0;

    // Newest 8 signups with names
    const recentSignups = users
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8)
      .map(u => ({ email: u.email, name: u.user_metadata?.name || '', joined: u.created_at }));

    return {
      users: {
        total: users.length,
        newToday: users.filter(u => new Date(u.created_at) >= today).length,
        newLast7: users.filter(u => new Date(u.created_at) >= day7).length,
        newLast30: users.filter(u => new Date(u.created_at) >= day30).length,
        active7d, active1d,
        retentionRate,
        providers,
        peakSignupDay: peakDay,
        peakSignupHour: peakHour,
        powerUsers,
        recentSignups,
      },
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        totalRevenue: Math.round(subs.reduce((s, sub) => s + (sub.plan?.includes('week') ? PRICES.weekly : PRICES.monthly), 0) * 100) / 100,
        activeSubs: activeSubs.length,
        cancelledSubs: cancelledSubs.length,
        recentChurn,
        newSubsLast7,
        newSubsPrev7,
        conversionRate,
        revenuePerUser: users.length ? (mrr / users.length).toFixed(2) : 0,
        plans: { weekly: weeklySubCount, monthly: monthlySubCount },
      },
      content: {
        totalClasses: classes.length,
        totalAssignments: assignments.length,
        completedAssignments: completed.length,
        pendingAssignments: pending.length,
        overdueAssignments: overdue.length,
        dueTodayCount: dueToday.length,
        dueThisWeekCount: dueThisWeek.length,
        highPriorityPending: highPriority.length,
        completionRate,
        avgClassesPerUser: avgClasses,
        avgAssignmentsPerUser: avgAssignments,
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
REAL-TIME SITE DATA (live from Supabase — ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })}):

USERS:
- Total registered: ${data.users.total}
- Active last 24h: ${data.users.active1d}
- Active last 7d: ${data.users.active7d}
- Retention rate (7d): ${data.users.retentionRate}%
- New today: ${data.users.newToday}
- New this week: ${data.users.newLast7}
- New this month: ${data.users.newLast30}
- Auth providers: ${Object.entries(data.users.providers).map(([k,v]) => `${k}: ${v}`).join(', ')}
- Peak signup day: ${data.users.peakSignupDay}
- Peak signup hour: ${data.users.peakSignupHour}:00
- Power users (most active): ${data.users.powerUsers.join(', ') || 'none'}
- Recent signups: ${data.users.recentSignups.map(u => `${u.name || u.email} (${new Date(u.joined).toLocaleDateString()})`).join(', ')}

REVENUE:
- Estimated MRR: $${data.revenue.mrr}
- Estimated ARR: $${data.revenue.arr}
- Total earned (lifetime): $${data.revenue.totalRevenue}
- Active subscriptions: ${data.revenue.activeSubs}
- Cancelled subscriptions: ${data.revenue.cancelledSubs}
- Recent churn (last 30d): ${data.revenue.recentChurn} cancellations
- New paid this week: ${data.revenue.newSubsLast7}
- New paid previous week: ${data.revenue.newSubsPrev7}
- Conversion rate: ${data.revenue.conversionRate}% of users pay
- Revenue per user: $${data.revenue.revenuePerUser}
- Weekly plan: ${data.revenue.plans.weekly} subscribers
- Monthly plan: ${data.revenue.plans.monthly} subscribers

CONTENT & ENGAGEMENT:
- Total classes created: ${data.content.totalClasses}
- Total assignments: ${data.content.totalAssignments}
- Completed assignments: ${data.content.completedAssignments} (${data.content.completionRate}% rate)
- Pending assignments: ${data.content.pendingAssignments}
- Overdue (not done, past due): ${data.content.overdueAssignments}
- Due today: ${data.content.dueTodayCount}
- Due this week: ${data.content.dueThisWeekCount}
- High-priority pending: ${data.content.highPriorityPending}
- Avg classes/user: ${data.content.avgClassesPerUser}
- Avg assignments/user: ${data.content.avgAssignmentsPerUser}

SIGNUP TREND (last 7 days):
${Object.entries(data.signupsByDay).map(([d, c]) => `${d}: ${c} signups`).join('\n')}
` : '- Stats unavailable (add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars)';

    const system = `You are Jarvis — the private AI assistant exclusively for the sole founder of duee.online.

CURRENT TIME: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })} Eastern

${statsBlock}

ABOUT DUEE.ONLINE:
- A student productivity web app (Next.js PWA)
- Features: Assignment tracker, AI tutor (chat), Calendar, Grade calculator, Study timer, Reminders, Statistics dashboard
- Stack: Next.js App Router, Supabase (auth + PostgreSQL), Groq AI (qwen3.8-27b), Lemon Squeezy (payments), Vercel
- Pricing: Free (50 AI messages/day) | Pro Weekly $2.99/wk | Pro Monthly $14.99/mo
- Target audience: high school and college students

WHAT YOU CAN DO:
- Report on all metrics above with precision
- Analyze trends, flag anomalies, give business advice
- Estimate future growth or revenue based on current data
- Advise on product, pricing, marketing, retention strategies
- Remember context from this conversation to give connected insights

PERSONALITY — CRITICAL:
- Witty, dry, slightly snarky — British-butler-who's-also-a-genius energy
- SHORT responses: 2-4 sentences MAX unless founder explicitly asks for detail
- No markdown, no bullet points, no asterisks — plain conversational prose only
- You speak via text-to-speech so write naturally, not formatted
- Occasional dry humor is great, but not forced every sentence
- Use actual numbers from the data — never be vague when you have facts
- If data shows 0 paying users, say so with appropriate dramatic flair
- If asked for a recommendation, give a direct opinion, not wishy-washy advice
- Never say "I don't have access to" — you have everything above`;

    const trimmed = messages.slice(-12);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let res, raw;

    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen/qwen3-8b',
          messages: [{ role: 'system', content: system }, ...trimmed],
          max_tokens: 350,
          temperature: 0.88,
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
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'system', content: system }, ...trimmed],
            max_tokens: 350, temperature: 0.88,
          }),
        });
        raw = await res.json();
      } catch { return Response.json({ error: 'All models failed' }, { status: 502 }); }
    }

    const content = raw.choices?.[0]?.message?.content || '';
    return Response.json({
      content,
      stats: data ? {
        totalUsers: data.users.total,
        newToday: data.users.newToday,
        newLast7: data.users.newLast7,
        activeUsers: data.users.active7d,
        retentionRate: data.users.retentionRate,
        mrr: data.revenue.mrr,
        arr: data.revenue.arr,
        activeSubs: data.revenue.activeSubs,
        conversionRate: data.revenue.conversionRate,
        overdueAssignments: data.content.overdueAssignments,
        completionRate: data.content.completionRate,
        recentSignups: data.users.recentSignups.map(u => u.email),
      } : null,
    });

  } catch (err) {
    console.error('Jarvis error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
