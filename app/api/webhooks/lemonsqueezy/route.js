/**
 * POST /api/webhooks/lemonsqueezy
 * Receives Lemon Squeezy webhook events and stores subscription status.
 *
 * Required env vars:
 *   LEMONSQUEEZY_WEBHOOK_SECRET
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL  (already in env)
 *
 * In Lemon Squeezy dashboard → Webhooks, enable events:
 *   subscription_created, subscription_updated, subscription_cancelled, subscription_expired
 *
 * Supabase table (run once in SQL editor):
 *   create table if not exists subscriptions (
 *     user_id       uuid primary key,
 *     subscription_id text,
 *     order_id        text,
 *     plan            text,
 *     status          text,
 *     renews_at       timestamptz,
 *     ends_at         timestamptz,
 *     updated_at      timestamptz default now()
 *   );
 *   alter table subscriptions enable row level security;
 *   create policy "service role only" on subscriptions using (false);
 */
import { createHmac } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://plbhhmhgkbqvdbaatabv.supabase.co';

async function upsertSubscription(userId, payload) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { console.warn('No SUPABASE_SERVICE_ROLE_KEY — subscription not stored'); return; }

  const attrs = payload.data?.attributes || {};
  const row = {
    user_id:         userId,
    subscription_id: String(payload.data?.id || ''),
    order_id:        String(attrs.order_id || ''),
    plan:            attrs.variant_name || attrs.product_name || 'pro',
    status:          attrs.status || 'active',
    renews_at:       attrs.renews_at || null,
    ends_at:         attrs.ends_at   || null,
    updated_at:      new Date().toISOString(),
  };

  await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  });
}

async function deleteSubscription(userId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;
  await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
  });
}

export async function POST(request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook secret not configured', { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get('x-signature') || '';

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (expected !== signature) return new Response('Invalid signature', { status: 401 });

  let payload;
  try { payload = JSON.parse(rawBody); } catch { return new Response('Bad JSON', { status: 400 }); }

  const event  = request.headers.get('x-event-name') || '';
  const userId = payload.meta?.custom_data?.user_id;

  if (!userId) { console.warn('LS webhook: no user_id in custom_data'); return new Response('OK'); }

  console.log(`LS webhook: ${event} for user ${userId}`);

  if (['subscription_created', 'subscription_updated'].includes(event)) {
    await upsertSubscription(userId, payload);
  } else if (['subscription_cancelled', 'subscription_expired'].includes(event)) {
    const attrs = payload.data?.attributes || {};
    // Keep row but mark as cancelled so they keep access until period ends
    await upsertSubscription(userId, { ...payload, data: { ...payload.data, attributes: { ...attrs, status: 'cancelled' } } });
  }

  return new Response('OK');
}
