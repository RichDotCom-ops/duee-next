'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Auth } from '../../lib/auth';

const CHECKOUT_URLS = {
  monthly: 'https://duee.lemonsqueezy.com/checkout/buy/5c140175-219a-4f17-b06c-18d69b75fd63',
  weekly:  'https://duee.lemonsqueezy.com/checkout/buy/f4e99050-6eff-4e7f-b029-e614c071842a',
};

const FEATURES_FREE = [
  'All classes & assignments',
  'Interactive calendar',
  'Study timer (Pomodoro)',
  'Grade calculator',
  'Real browser notifications',
  'Dark mode',
  '20 AI messages per day',
];

const FEATURES_PRO = [
  'Everything in Free',
  'Unlimited AI messages',
  'Image & screenshot analysis',
  'Priority AI responses',
  'AI study plans',
  'Early access to new features',
  'Cancel anytime',
];

export default function PricingPage() {
  const [billing,   setBilling]  = useState('monthly');
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState('');
  const [loggedIn,  setLoggedIn] = useState(false);

  useEffect(() => {
    Auth.getSession().then(s => setLoggedIn(!!s?.user));
  }, []);

  async function handleCheckout() {
    setLoading(true); setError('');
    try {
      const session = await Auth.getSession();
      let url = CHECKOUT_URLS[billing];
      if (session?.user?.email) {
        url += `?checkout[email]=${encodeURIComponent(session.user.email)}&checkout[custom][user_id]=${session.user.id}`;
      }
      // Open in new tab so user keeps dashboard open
      window.open(url, '_blank', 'noopener');
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="pub-page">
      <nav className="pub-nav">
        <Link href={loggedIn ? '/dashboard' : '/'} className="pub-nav-logo">duee<span>.</span></Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {loggedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Home</Link>
              <Link href="/login" className="btn btn-primary btn-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--green-light)', color: 'var(--green-text)', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, marginBottom: 20 }}>
            Simple Pricing
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 14 }}>Start free. Upgrade anytime.</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 28px' }}>
            No contracts, no hidden fees. The free plan is free forever.
          </p>
          <div style={{ display: 'inline-flex', background: 'var(--bg-hover)', borderRadius: 'var(--radius)', padding: 3, gap: 2 }}>
            {['weekly', 'monthly'].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{ padding: '7px 20px', borderRadius: 6, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', background: billing === b ? 'white' : 'transparent', color: billing === b ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: billing === b ? 'var(--shadow-sm)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                {b === 'monthly' ? 'Monthly' : 'Weekly'}
                {b === 'monthly' && <span style={{ background: 'var(--green)', color: 'white', padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>Best Value</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Free */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>📚</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Free</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>Everything you need to get organized. No card required.</div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>free forever</div>
            <Link href="/login?mode=signup" className="btn btn-outline" style={{ textAlign: 'center', justifyContent: 'center', marginBottom: 28 }}>Get Started Free</Link>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES_FREE.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div style={{ background: 'white', border: '2px solid var(--green)', borderRadius: 'var(--radius-lg)', padding: 32, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--green)', color: 'white', padding: '3px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {billing === 'monthly' ? 'Most Popular' : 'Flexible'}
            </div>
            <div style={{ fontSize: 22, marginBottom: 10 }}>⚡</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Pro {billing === 'monthly' ? 'Monthly' : 'Weekly'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
              {billing === 'monthly' ? 'The full duee. experience all semester.' : 'Flexible access for exam season.'}
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', marginBottom: 4 }}>
              {billing === 'monthly' ? '$15' : '$2.99'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
              per {billing}
            </div>

            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn btn-primary"
              style={{ justifyContent: 'center', marginBottom: 10, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Opening checkout…' : `Get Pro ${billing === 'monthly' ? 'Monthly' : 'Weekly'} →`}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Opens secure checkout in a new tab — you can come back here anytime.
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES_PRO.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 24, textAlign: 'center' }}>FAQ</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { q: 'Is the free plan really free forever?', a: 'Yes. The free plan includes all core features — classes, assignments, calendar, grade calculator, and 20 AI messages per day — forever.' },
              { q: 'Can I cancel my Pro subscription anytime?', a: "Absolutely. Cancel in one click, no questions asked. You'll keep Pro until the end of your billing period." },
              { q: 'What counts as an AI message?', a: 'Every message you send to the AI counts as one. Free gives you 20 per day. Pro gives you unlimited.' },
              { q: 'Can I upload images to the AI?', a: 'Yes! Pro users can share screenshots of assignments, textbook pages, or problems and the AI will help you work through them.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{item.q}</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 60, padding: '40px', background: 'var(--text-primary)', borderRadius: 'var(--radius-lg)', color: 'white' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Ready to stop missing deadlines?</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>Join students already using duee. to stay on top of their work.</p>
          <Link href="/login?mode=signup" className="btn-cta-white">Get Started Free →</Link>
        </div>
      </div>

      <footer style={{ padding: '28px 48px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
        <span>© 2026 duee. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
