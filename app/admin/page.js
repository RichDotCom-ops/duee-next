'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const diff = Date.now() - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function fmt$(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// Tiny bar chart — no library needed
function BarChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const last7 = data.slice(-7);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48, padding: '0 2px' }}>
      {last7.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div
            style={{
              width: '100%', borderRadius: 3,
              background: i === last7.length - 1 ? '#16a34a' : '#bbf7d0',
              height: `${Math.max((d.count / max) * 40, d.count > 0 ? 4 : 0)}px`,
              transition: 'height .3s',
            }}
            title={`${d.date}: ${d.count} signups`}
          />
          <div style={{ fontSize: 9, color: '#9ca3af', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
            {new Date(d.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [secret, setSecret]     = useState('');
  const [authed, setAuthed]     = useState(false);
  const [data,   setData]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [tab,     setTab]       = useState('overview');
  const [search,  setSearch]    = useState('');

  const load = useCallback(async (key) => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/stats', { headers: { 'x-admin-secret': key } });
      const json = await res.json();
      if (res.status === 401) { setError('Wrong password.'); setAuthed(false); return; }
      if (json.error) { setError(json.error); return; }
      setData(json);
      setAuthed(true);
      sessionStorage.setItem('admin_secret', key);
    } catch { setError('Failed to load stats.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret');
    if (saved) { setSecret(saved); load(saved); }
  }, [load]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => load(secret), 60000);
    return () => clearInterval(t);
  }, [authed, secret, load]);

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 16, padding: 40, width: 360 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 4 }}>duee<span style={{ color: '#4ade80' }}>.</span> admin</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>Internal dashboard — authorized access only</div>
          {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <input
            type="password"
            placeholder="Admin password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(secret)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #21262d', background: '#0d1117', color: 'white', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }}
            autoFocus
          />
          <button
            onClick={() => load(secret)}
            disabled={!secret || loading}
            style={{ width: '100%', padding: '11px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (!secret || loading) ? 0.6 : 1 }}
          >
            {loading ? 'Checking…' : 'Access Dashboard'}
          </button>
          <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12, color: '#6b7280' }}>← Back to site</Link>
        </div>
      </div>
    );
  }

  const { users, content, subscriptions, charts, recentUsers } = data || {};

  const filteredUsers = (recentUsers || []).filter(u =>
    !search || u.email?.includes(search) || u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { label: 'Total Users', value: users?.total ?? '—', sub: `+${users?.newToday ?? 0} today`, color: '#2563eb', bg: 'linear-gradient(135deg,#1e3a8a18,#dbeafe)' },
    { label: 'Active (7d)', value: users?.active7d ?? '—', sub: `${users?.newLast7 ?? 0} new this week`, color: '#16a34a', bg: 'linear-gradient(135deg,#14532d18,#dcfce7)' },
    { label: 'Pro Subscribers', value: subscriptions?.active ?? '—', sub: `${subscriptions?.cancelled ?? 0} cancelled`, color: '#7c3aed', bg: 'linear-gradient(135deg,#4c1d9518,#ede9fe)' },
    { label: 'MRR (est.)', value: fmt$(subscriptions?.monthlyRevenue ?? 0), sub: `${fmt$(subscriptions?.totalRevenue ?? 0)} total earned`, color: '#b45309', bg: 'linear-gradient(135deg,#78350f18,#fef3c7)' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', fontFamily: "'Space Grotesk', 'Inter', sans-serif", color: 'white' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #21262d', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1117', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>duee<span style={{ color: '#4ade80' }}>.</span> admin</div>
          <div style={{ width: 1, height: 20, background: '#21262d' }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {['overview', 'users', 'revenue'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t ? '#16a34a' : 'transparent', color: tab === t ? 'white' : '#6b7280', textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#4b5563' }}>Updated {fmtDate(data?.generatedAt)}</div>
          <button onClick={() => load(secret)} disabled={loading} style={{ padding: '6px 14px', background: '#161b22', border: '1px solid #21262d', color: '#9ca3af', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? '…' : '↻ Refresh'}
          </button>
          <button onClick={() => { setAuthed(false); sessionStorage.removeItem('admin_secret'); }} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #21262d', color: '#6b7280', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
              {statCards.map((s, i) => (
                <div key={i} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Two-column: chart + content stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

              {/* Signup chart */}
              <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Signups — last 7 days</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>
                  {charts?.signupsByDay?.slice(-7).reduce((s, d) => s + d.count, 0) || 0} new users this week
                </div>
                <BarChart data={charts?.signupsByDay} />
              </div>

              {/* Content stats */}
              <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Platform usage</div>
                {[
                  { label: 'Total classes created', value: content?.totalClasses ?? 0, color: '#2563eb' },
                  { label: 'Total assignments', value: content?.totalAssignments ?? 0, color: '#7c3aed' },
                  { label: 'Assignments completed', value: content?.completedAssignments ?? 0, color: '#16a34a' },
                  { label: 'Completion rate', value: content?.totalAssignments ? `${Math.round((content.completedAssignments / content.totalAssignments) * 100)}%` : '—', color: '#b45309' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #21262d' : 'none' }}>
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>{row.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: row.color }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* User growth mini stats */}
            <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>User growth</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                {[
                  { label: 'New today', value: users?.newToday ?? 0 },
                  { label: 'New this week', value: users?.newLast7 ?? 0 },
                  { label: 'New this month', value: users?.newLast30 ?? 0 },
                  { label: 'Total', value: users?.total ?? 0 },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#4ade80' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Users tab ── */}
        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Recent Users <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 400 }}>({recentUsers?.length ?? 0} shown)</span></div>
              <input
                placeholder="Search by email or name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', background: '#161b22', border: '1px solid #21262d', color: 'white', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', width: 240 }}
              />
            </div>
            <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 100px', gap: 0 }}>
                {/* Header */}
                {['User', 'Joined', 'Last active', 'Provider'].map(h => (
                  <div key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '.04em', background: '#0d1117', borderBottom: '1px solid #21262d' }}>{h}</div>
                ))}
                {/* Rows */}
                {filteredUsers.map((u, i) => (
                  <>
                    <div key={`n${i}`} style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{u.email}</div>
                    </div>
                    <div key={`c${i}`} style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center' }}>{fmtDate(u.createdAt)}</div>
                    <div key={`l${i}`} style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center' }}>{fmtDate(u.lastLogin)}</div>
                    <div key={`p${i}`} style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center' }}>
                      <span style={{ background: u.provider === 'google' ? '#dbeafe' : '#dcfce7', color: u.provider === 'google' ? '#1e40af' : '#166534', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                        {u.provider}
                      </span>
                    </div>
                  </>
                ))}
              </div>
              {filteredUsers.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#4b5563', fontSize: 14 }}>No users found</div>
              )}
            </div>
          </>
        )}

        {/* ── Revenue tab ── */}
        {tab === 'revenue' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Est. MRR', value: fmt$(subscriptions?.monthlyRevenue ?? 0), sub: 'from active subscribers', color: '#16a34a' },
                { label: 'Total Earned', value: fmt$(subscriptions?.totalRevenue ?? 0), sub: 'all time', color: '#7c3aed' },
                { label: 'Active Subs', value: subscriptions?.active ?? 0, sub: `${subscriptions?.cancelled ?? 0} cancelled`, color: '#2563eb' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #21262d', fontSize: 14, fontWeight: 700 }}>
                Subscriptions ({subscriptions?.list?.length ?? 0})
              </div>
              {(!subscriptions?.list?.length) ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#4b5563', fontSize: 14 }}>
                  No subscriptions yet. Make sure SUPABASE_SERVICE_ROLE_KEY and the webhook are set up.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px', background: '#0d1117', borderBottom: '1px solid #21262d' }}>
                    {['User ID', 'Plan', 'Status', 'Updated'].map(h => (
                      <div key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</div>
                    ))}
                  </div>
                  {subscriptions.list.map((s, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px', borderBottom: '1px solid #21262d' }}>
                      <div style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{s.user_id?.slice(0, 16)}…</div>
                      <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{s.plan || '—'}</div>
                      <div style={{ padding: '12px 16px' }}>
                        <span style={{ background: s.status === 'active' ? '#dcfce7' : '#fee2e2', color: s.status === 'active' ? '#166534' : '#dc2626', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                          {s.status}
                        </span>
                      </div>
                      <div style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{fmtDate(s.updated_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, padding: 16, background: '#161b22', border: '1px solid #21262d', borderRadius: 10, fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
              Revenue is estimated based on plan prices ($2.99/week, $14.99/month). For exact figures, check your{' '}
              <a href="https://app.lemonsqueezy.com" target="_blank" rel="noopener" style={{ color: '#4ade80' }}>Lemon Squeezy dashboard</a>.
            </div>
          </>
        )}

      </div>
    </div>
  );
}
