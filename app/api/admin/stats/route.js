/**
 * GET /api/admin/stats
 * Returns site-wide stats for the admin dashboard.
 * Protected by ADMIN_SECRET header.
 */

const SUPABASE_URL = 'https://plbhhmhgkbqvdbaatabv.supabase.co';

async function query(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  return res.json();
}

export async function GET(request) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return Response.json({ error: 'Service key not configured' }, { status: 503 });
  }

  try {
    // Fetch users from Supabase auth
    const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });
    const usersData = await usersRes.json();
    const users = usersData.users || [];

    // Fetch subscriptions
    let subscriptions = [];
    try {
      subscriptions = await query('subscriptions?select=*&order=updated_at.desc', serviceKey);
      if (!Array.isArray(subscriptions)) subscriptions = [];
    } catch {}

    // Fetch classes count
    let classesData = [];
    try {
      classesData = await query('classes?select=id,created_at,user_id', serviceKey);
      if (!Array.isArray(classesData)) classesData = [];
    } catch {}

    // Fetch assignments count
    let assignmentsData = [];
    try {
      assignmentsData = await query('assignments?select=id,created_at,completed,user_id', serviceKey);
      if (!Array.isArray(assignmentsData)) assignmentsData = [];
    } catch {}

    // Compute stats
    const now = new Date();
    const day7 = new Date(now - 7 * 86400000);
    const day30 = new Date(now - 30 * 86400000);
    const today = new Date(); today.setHours(0,0,0,0);

    const totalUsers = users.length;
    const newToday = users.filter(u => new Date(u.created_at) >= today).length;
    const newLast7  = users.filter(u => new Date(u.created_at) >= day7).length;
    const newLast30 = users.filter(u => new Date(u.created_at) >= day30).length;

    // Active users = logged in within 7 days
    const activeUsers = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= day7).length;

    // Subscriptions
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled');

    // Revenue (Lemon Squeezy prices)
    const PRICES = { weekly: 2.99, monthly: 14.99 };
    const monthlyRevenue = activeSubs.reduce((sum, s) => {
      const plan = (s.plan || '').toLowerCase();
      if (plan.includes('week') || plan.includes('weekly')) return sum + PRICES.weekly * 4.33;
      return sum + PRICES.monthly;
    }, 0);
    const totalRevenue = subscriptions.reduce((sum, s) => {
      const plan = (s.plan || '').toLowerCase();
      return sum + (plan.includes('week') ? PRICES.weekly : PRICES.monthly);
    }, 0);

    // User signups over last 30 days (daily buckets)
    const signupsByDay = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().split('T')[0];
      signupsByDay[key] = 0;
    }
    users.forEach(u => {
      const key = new Date(u.created_at).toISOString().split('T')[0];
      if (signupsByDay[key] !== undefined) signupsByDay[key]++;
    });
    const signupChart = Object.entries(signupsByDay).sort(([a],[b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

    // Recent signups
    const recentUsers = users
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20)
      .map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || '',
        createdAt: u.created_at,
        lastLogin: u.last_sign_in_at,
        provider: u.app_metadata?.provider || 'email',
      }));

    return Response.json({
      users: {
        total: totalUsers,
        newToday,
        newLast7,
        newLast30,
        active7d: activeUsers,
      },
      content: {
        totalClasses: classesData.length,
        totalAssignments: assignmentsData.length,
        completedAssignments: assignmentsData.filter(a => a.completed).length,
      },
      subscriptions: {
        active: activeSubs.length,
        cancelled: cancelledSubs.length,
        total: subscriptions.length,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        list: subscriptions.slice(0, 50),
      },
      charts: { signupsByDay: signupChart },
      recentUsers,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
