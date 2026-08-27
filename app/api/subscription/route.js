/**
 * GET /api/subscription?userId=...
 * Returns the user's current subscription status from Supabase.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://plbhhmhgkbqvdbaatabv.supabase.co';

export async function GET(request) {
  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return Response.json({ pro: false });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // No service key — check if redirected from Lemon Squeezy with ?pro=1 on client side
    return Response.json({ pro: false, reason: 'not_configured' });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=status,renews_at,ends_at,plan`, {
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });
    const rows = await res.json();
    const sub = rows?.[0];
    if (!sub) return Response.json({ pro: false });

    const isActive = sub.status === 'active' || (sub.status === 'cancelled' && sub.ends_at && new Date(sub.ends_at) > new Date());
    return Response.json({ pro: isActive, plan: sub.plan, status: sub.status, endsAt: sub.ends_at });
  } catch (err) {
    console.error('Subscription check error:', err);
    return Response.json({ pro: false });
  }
}
