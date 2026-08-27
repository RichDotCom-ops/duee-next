'use client';
import { useEffect, useRef, useState } from 'react';

const VIDEO_ID = '83iSYcQchVQ';

function VideoPlayer() {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef(null);

  function play() {
    setPlaying(true);
  }

  return (
    <section className="lp-video-section lp-reveal">
      <div className="lp-video-inner">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="lp-label" style={{ color: '#4ade80' }}>Watch it in action</div>
          <h2 className="lp-h2" style={{ color: 'white' }}>See duee. in 60 seconds</h2>
          <p className="lp-p" style={{ color: '#94a3b8', margin: '0 auto' }}>
            Track assignments, chat with your AI tutor, and never miss a deadline.
          </p>
        </div>

        <div
          className={`lp-video-player${playing ? ' playing' : ''}`}
          ref={playerRef}
          onClick={!playing ? play : undefined}
          style={{ cursor: playing ? 'default' : 'pointer' }}
        >
          {!playing ? (
            <>
              {/* YouTube thumbnail */}
              <img
                className="lp-video-thumb"
                src={`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
                alt="duee. demo video"
                onError={e => { e.target.src = `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`; }}
              />
              <div className="lp-video-overlay">
                <div className="lp-play-btn">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
              </div>
              <div className="lp-video-label">
                <span className="lp-video-dot" />
                Watch the demo
              </div>
            </>
          ) : (
            <iframe
              className="lp-video-frame"
              src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&color=white&iv_load_policy=3`}
              title="duee. demo"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        <p className="lp-video-caption">No sign-up required to watch · 60 seconds</p>
      </div>
    </section>
  );
}
import Link from 'next/link';

const WORDS = ['every deadline.', 'finals week.', 'your GPA.', 'every class.'];

const FEATURES = [
  {
    svg: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
    color: '#2563eb', bg: '#dbeafe', glow: 'rgba(37,99,235,.15)',
    title: 'Assignment Tracker', desc: "Never lose track of what's due. Due dates, priorities, and class tags — all in one clean view.",
  },
  {
    svg: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    color: '#7c3aed', bg: '#ede9fe', glow: 'rgba(124,58,237,.15)',
    title: 'Interactive Calendar', desc: 'Month, week, or day view. Add and remove assignments directly from the calendar.',
  },
  {
    svg: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h5"/></svg>,
    color: '#16a34a', bg: '#dcfce7', glow: 'rgba(22,163,74,.15)',
    title: 'AI Study Tutor', desc: "Ask anything, add assignments by voice, get study plans — an AI that actually helps you learn.",
  },
  {
    svg: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    color: '#ea580c', bg: '#ffedd5', glow: 'rgba(234,88,12,.15)',
    title: 'Grade Calculator', desc: "What score do you need on your final to get an A? Know exactly where you stand.",
  },
  {
    svg: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    color: '#0891b2', bg: '#cffafe', glow: 'rgba(8,145,178,.15)',
    title: 'Study Timer', desc: 'Built-in Pomodoro timer. Pick an assignment, focus for 25 minutes, track time per subject.',
  },
  {
    svg: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    color: '#ca8a04', bg: '#fef9c3', glow: 'rgba(202,138,4,.15)',
    title: 'Progress & Streaks', desc: 'Completion rates, study streaks, and class breakdowns. See yourself getting better every day.',
  },
];


const DIFF_ITEMS = [
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    color: '#7c3aed', bg: '#ede9fe',
    title: 'Your planner, not theirs',
    desc: "Blackboard serves professors. Duee serves you. It's built around your workflow, your priorities, and your goals — not a syllabus upload.",
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>,
    color: '#16a34a', bg: '#dcfce7',
    title: "AI that actually teaches",
    desc: "Not just a to-do list. Ask the AI to explain a concept, build a study schedule, or quiz you on your weakest topics. It remembers your style.",
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    color: '#ea580c', bg: '#ffedd5',
    title: 'Progress you can feel',
    desc: "Study streaks, grade projections, completion rates, time tracked per subject. Duee makes progress visible — so you stay motivated.",
  },
];

export default function LandingPage() {
  const [wordIdx, setWordIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);

  // Word rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => { setWordIdx(i => (i + 1) % WORDS.length); setFading(false); }, 350);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Preview animation on mount
  useEffect(() => {
    const t1 = setTimeout(() => setPreviewStep(1), 300);
    const t2 = setTimeout(() => setPreviewStep(2), 700);
    const t3 = setTimeout(() => setPreviewStep(3), 1100);
    const t4 = setTimeout(() => setPreviewStep(4), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // Scroll progress + nav state
  useEffect(() => {
    const progressEl = document.getElementById('scroll-progress');
    function onScroll() {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (progressEl) progressEl.style.width = ((scrollTop / (scrollHeight - clientHeight)) * 100) + '%';
      setNavScrolled(scrollTop > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lp-visible'); obs.unobserve(e.target); } }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);


  return (
    <>
      <div id="scroll-progress" style={{ position: 'fixed', top: 0, left: 0, height: '2px', background: 'linear-gradient(90deg,#16a34a,#4ade80,#7c3aed)', zIndex: 9999, width: '0%', transition: 'width .1s linear' }} />

      {/* Nav */}
      <nav className={`lp-nav${navScrolled ? ' scrolled' : ''}`}>
        <Link href="/" className="lp-logo">duee<span>.</span></Link>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <Link href="/blog">Blog</Link>
        </div>
        <div className="lp-nav-actions">
          <Link href="/login" className="lp-btn-login">Log in</Link>
          <Link href="/login?mode=signup" className="lp-btn-cta-sm">Get Started Free</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        {/* Animated orbs */}
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
        {/* Grid overlay */}
        <div className="lp-grid-overlay" />

        <div className="lp-hero-inner">
          {/* Content */}
          <div className="lp-hero-content">
            <div className="lp-badge">
              <span className="lp-badge-dot" />
              The secret weapon straight-A students don&apos;t share
            </div>

            <h1 className="lp-headline">
              The cheat code<br />for{' '}
              <span
                className="lp-gradient-word"
                style={{
                  opacity: fading ? 0 : 1,
                  transform: fading ? 'translateY(-12px)' : 'translateY(0)',
                  transition: 'opacity .35s ease, transform .35s cubic-bezier(.22,1,.36,1)',
                }}
              >
                {WORDS[wordIdx]}
              </span>
            </h1>

            <p className="lp-hero-sub">
              Every deadline tracked. Every assignment organized.<br />
              An AI tutor in your pocket — so you stop falling behind<br />and start actually winning.
            </p>

            <div className="lp-hero-actions">
              <Link href="/login?mode=signup" className="lp-cta-btn">
                Get Your Unfair Advantage
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <a href="#how-it-works" className="lp-ghost-btn">
                See how it works
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </a>
            </div>

            <div className="lp-perks">
              {['Free to start', '2-min setup', 'No card needed', 'AI included'].map(p => (
                <span className="lp-perk" key={p}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* App Preview */}
          <div className="lp-hero-visual">
            <div className="lp-preview-wrap">
              {/* Glow behind preview */}
              <div className="lp-preview-glow" />

              <div className="lp-app-preview">
                {/* Titlebar */}
                <div className="lp-preview-bar">
                  <div className="lp-preview-dots">
                    <span style={{ background: '#fc5c65' }} />
                    <span style={{ background: '#feca57' }} />
                    <span style={{ background: '#1dd1a1' }} />
                  </div>
                  <div className="lp-preview-bartitle">duee. — Dashboard</div>
                </div>

                {/* Greeting */}
                <div className="lp-preview-greeting">
                  Good morning, Alex
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: .6, marginLeft: 5 }}>
                    <path d="M18 11V6.6a.6.6 0 0 0-1.2 0V11"/><path d="M15 12V5.6a.6.6 0 0 0-1.2 0V12"/><path d="M12 11.4V4.6a.6.6 0 0 0-1.2 0V14"/><path d="M9 11V7.6a.6.6 0 0 0-1.2 0v5.9l-.9-1.6a.6.6 0 0 0-1 .6l1.7 4.4A5 5 0 0 0 12 21a5 5 0 0 0 5-5v-5"/>
                  </svg>
                </div>

                {/* Stats */}
                <div className={`lp-preview-stats${previewStep >= 1 ? ' visible' : ''}`}>
                  <div className="lp-pstat"><div className="lp-pstat-n" style={{ color: '#dc2626' }}>3</div><div className="lp-pstat-l">Due Today</div></div>
                  <div className="lp-pstat"><div className="lp-pstat-n">7</div><div className="lp-pstat-l">This Week</div></div>
                  <div className="lp-pstat"><div className="lp-pstat-n">12</div><div className="lp-pstat-l">Upcoming</div></div>
                  <div className="lp-pstat"><div className="lp-pstat-n" style={{ color: '#16a34a' }}>24</div><div className="lp-pstat-l">Completed</div></div>
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 6 }}>Today&apos;s Plan</div>

                {/* Assignment items */}
                {[
                  { color: '#dc2626', name: 'Calculus Problem Set 4', time: 'Due today', delay: 2 },
                  { color: '#7c3aed', name: 'History Essay Draft', time: 'Tomorrow', delay: 3 },
                  { color: '#16a34a', name: 'Biology Lab Report', time: '3 days', delay: 4 },
                ].map((a, i) => (
                  <div key={i} className={`lp-pitem${previewStep >= a.delay - 1 ? ' visible' : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                    <div className="lp-pitem-stripe" style={{ background: a.color }} />
                    <div className="lp-pitem-name">{a.name}</div>
                    <div className="lp-pitem-time" style={{ color: i === 0 ? '#dc2626' : undefined }}>{a.time}</div>
                  </div>
                ))}

                {/* AI bar */}
                <div className={`lp-preview-ai${previewStep >= 4 ? ' visible' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  AI: Focus on Calculus first — it&apos;s due in 6 hours.
                </div>
              </div>

              {/* Floating badges */}
              <div className="lp-badge-done">
                <div className="lp-badge-check">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>Assignment done!</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>History Essay · just now</div>
                </div>
              </div>

              <div className="lp-badge-remind">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span>Calculus due in 6 hours</span>
              </div>

              <div className="lp-badge-streak">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M12 2c0 0-5.5 5.5-5.5 10.5a5.5 5.5 0 0 0 11 0C17.5 7.5 12 2 12 2z"/></svg>
                <span style={{ fontWeight: 700, color: '#f97316' }}>7 day streak!</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── Not Blackboard ── */}
      <section className="lp-section lp-diff-section" id="why">
        <div className="lp-section-inner">
          <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lp-label">Built different</div>
            <h2 className="lp-h2">Not your school&apos;s LMS</h2>
            <p className="lp-p">Blackboard tells you what professors assigned. Duee tells you what to do <em>first</em> — and helps you actually do it.</p>
          </div>

          <div className="lp-diff-grid">
            {DIFF_ITEMS.map((d, i) => (
              <div className="lp-diff-card lp-reveal" key={i} style={{ transitionDelay: `${i * 0.12}s` }}>
                <div className="lp-diff-icon" style={{ background: d.bg, color: d.color }}>{d.icon}</div>
                <h3 className="lp-diff-title">{d.title}</h3>
                <p className="lp-diff-desc">{d.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick comparison table */}
          <div className="lp-compare-wrap lp-reveal" style={{ transitionDelay: '0.2s' }}>
            <table className="lp-compare">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="lp-compare-bb">Blackboard</th>
                  <th className="lp-compare-duee">duee.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Tells you what to do first', false, true],
                  ['Built-in AI tutor', false, true],
                  ['Study timer & streaks', false, true],
                  ['Grade projection calculator', false, true],
                  ['Clean, fast, modern UI', false, true],
                  ['Course content delivery', true, false],
                ].map(([label, bb, duee], i) => (
                  <tr key={i}>
                    <td>{label}</td>
                    <td className="lp-compare-bb">{bb ? <span className="lp-tick green">✓</span> : <span className="lp-tick muted">—</span>}</td>
                    <td className="lp-compare-duee">{duee ? <span className="lp-tick green">✓</span> : <span className="lp-tick muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section lp-features-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 12 }}>
            <div className="lp-label">Features</div>
            <h2 className="lp-h2">Everything you need to stay on top</h2>
            <p className="lp-p" style={{ margin: '0 auto' }}>Built specifically for students who want to stop stressing and start succeeding.</p>
          </div>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <div className="lp-feat-card lp-reveal" key={i} style={{ transitionDelay: `${(i % 3) * 0.1}s`, '--glow': f.glow }}>
                <div className="lp-feat-icon" style={{ background: f.bg, color: f.color }}>{f.svg}</div>
                <h3 className="lp-feat-title">{f.title}</h3>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="lp-how-section" id="how-it-works">
        <div className="lp-section-inner">
          <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lp-label">How It Works</div>
            <h2 className="lp-h2">Set up in under 2 minutes</h2>
            <p className="lp-p" style={{ margin: '0 auto' }}>No learning curve. No manual to read. Just open it and go.</p>
          </div>

          <div className="lp-steps">
            <div className="lp-steps-line" />
            {[
              { n: '1', title: 'Sign up free', desc: 'No credit card. No setup fee. Ready in 30 seconds.' },
              { n: '2', title: 'Add your classes', desc: 'Enter your courses or just tell the AI — it sets them up.' },
              { n: '3', title: 'Drop in assignments', desc: 'Type them or say "Add Calculus homework due Friday" — done.' },
              { n: '✓', title: 'Never fall behind', desc: 'AI check-ins, reminders, and a dashboard that keeps you winning.', done: true },
            ].map((s, i) => (
              <div className="lp-step lp-reveal" key={i} style={{ transitionDelay: `${i * 0.12}s` }}>
                <div className={`lp-step-num${s.done ? ' done' : ''}`}>{s.n}</div>
                <h3 className="lp-step-title" style={s.done ? { color: '#16a34a' } : {}}>{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Video ── */}
      <VideoPlayer />


      {/* ── Pricing ── */}
      <div id="pricing" className="lp-pricing-section">
        <div className="lp-section-inner lp-reveal">
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div className="lp-label" style={{ color: '#4ade80' }}>Pricing</div>
            <h2 className="lp-h2" style={{ color: 'white' }}>Simple, honest pricing</h2>
            <p className="lp-p" style={{ color: '#94a3b8', margin: '0 auto 48px' }}>Start free. Upgrade when you want unlimited AI.</p>
          </div>

          <div className="lp-pricing-grid">
            {/* Free */}
            <div className="lp-plan">
              <div className="lp-plan-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div className="lp-plan-name">Free</div>
              <div className="lp-plan-desc">Everything you need to get organized.</div>
              <div className="lp-plan-price">$0 <span>/ forever</span></div>
              <div style={{ height: 44 }} />
              <Link href="/login?mode=signup" className="lp-plan-cta lp-cta-free">Get Started Free</Link>
              <div className="lp-divider" />
              <div className="lp-features">
                {['All classes & assignments', 'Interactive calendar', 'Real browser notifications', 'Study timer & dark mode', '20 AI messages / day'].map(f => <div className="lp-feat" key={f}><span className="y">✓</span> {f}</div>)}
                <div className="lp-feat"><span className="n">–</span> Unlimited AI</div>
              </div>
            </div>

            {/* Weekly */}
            <div className="lp-plan">
              <div className="lp-plan-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div className="lp-plan-name">Pro Weekly</div>
              <div className="lp-plan-desc">Flexible AI access — pay week by week.</div>
              <div className="lp-plan-price">$2.99 <span>/ week</span></div>
              <div style={{ height: 44 }} />
              <Link href="/pricing" className="lp-plan-cta lp-cta-pro">Get Weekly →</Link>
              <div className="lp-divider" />
              <div className="lp-features">
                {['Everything in Free', '200 AI messages / week', 'No long-term commitment', 'Cancel anytime'].map(f => <div className="lp-feat" key={f}><span className="y">✓</span> <strong>{f.includes('Everything') ? f : ''}</strong>{!f.includes('Everything') ? f : ''}</div>)}
                <div className="lp-feat"><span className="n">–</span> AI study plans</div>
                <div className="lp-feat"><span className="n">–</span> Early feature access</div>
              </div>
            </div>

            {/* Monthly — featured */}
            <div className="lp-plan featured">
              <div className="lp-popular">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                {' '}Best Value
              </div>
              <div className="lp-plan-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#4ade80" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div className="lp-plan-name">Pro Monthly</div>
              <div className="lp-plan-desc">The full duee. experience all semester.</div>
              <div className="lp-plan-price">$15 <span>/ month</span></div>
              <div style={{ height: 44 }}><span className="lp-plan-save">Save vs weekly · ~$12/mo equivalent</span></div>
              <Link href="/pricing" className="lp-plan-cta lp-cta-pro">Get Monthly →</Link>
              <div className="lp-divider" />
              <div className="lp-features">
                {['Everything in Free', 'Unlimited AI messages', 'AI study plans', 'Early access to new features', 'Cancel anytime'].map(f => <div className="lp-feat" key={f}><span className="y">✓</span> {f}</div>)}
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', marginTop: 28 }}>
            No contracts. No hidden fees. Cancel anytime.{' '}
            <Link href="/pricing" style={{ color: '#4ade80', fontWeight: 600 }}>See full pricing →</Link>
          </p>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <section className="lp-final-cta">
        <div className="lp-final-cta-orb lp-final-orb-1" />
        <div className="lp-final-cta-orb lp-final-orb-2" />
        <div className="lp-final-inner lp-reveal">
          <div className="lp-final-badge">FREE TO START · NO CARD NEEDED</div>
          <h2 className="lp-final-h2">Stop surviving school.<br />Start owning it.</h2>
          <p className="lp-final-sub">Built for students who want to stop stressing and actually stay ahead.</p>
          <Link href="/login?mode=signup" className="lp-final-btn">
            Get Your Unfair Advantage
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Takes 30 seconds. No credit card.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">duee<span>.</span></div>
        <div className="lp-footer-copy">© 2026 duee. All rights reserved.</div>
        <div className="lp-footer-links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>
    </>
  );
}
