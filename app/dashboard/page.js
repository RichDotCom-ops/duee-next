'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Auth } from '../../lib/auth';
import { DB } from '../../lib/data';
import AppLayout from '../../components/AppLayout';
import { getGreeting, getDaysUntil, initTheme } from '../../lib/utils';

const STREAK_KEY = uid => `duee_streak_${uid}`;

function loadStreak(uid) {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY(uid))) || { streak: 0, lastDate: null, best: 0 }; }
  catch { return { streak: 0, lastDate: null, best: 0 }; }
}
function touchStreak(uid) {
  const today = new Date().toISOString().split('T')[0];
  const data = loadStreak(uid);
  if (data.lastDate === today) return data;
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const yStr = yest.toISOString().split('T')[0];
  const newStreak = data.lastDate === yStr ? data.streak + 1 : 1;
  const best = Math.max(newStreak, data.best || 0);
  const updated = { streak: newStreak, lastDate: today, best };
  localStorage.setItem(STREAK_KEY(uid), JSON.stringify(updated));
  return updated;
}
function loadTodayStudied(uid) {
  try {
    const data = JSON.parse(localStorage.getItem(`duee_study_today_${uid}`));
    if (!data) return 0;
    return data.date === new Date().toISOString().split('T')[0] ? (data.minutes || 0) : 0;
  } catch { return 0; }
}

function useCountUp(target, active, duration = 900) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setVal(target);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, active]);
  return val;
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({ dueToday: 0, dueThisWeek: 0, upcoming: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ streak: 0, best: 0 });
  const [todayStudied, setTodayStudied] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isPro,   setIsPro]   = useState(false);

  useEffect(() => {
    initTheme();
    // Check if returning from Lemon Squeezy checkout
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pro') === '1') {
      localStorage.setItem('duee_pro_pending', '1');
      window.history.replaceState({}, '', '/dashboard');
    }
    async function load() {
      const session = await Auth.requireAuth();
      if (!session) return;
      const u = session.user;
      setUser(u);
      const [cls, asgn] = await Promise.all([DB.getClasses(u.id), DB.getAssignments(u.id)]);
      setClasses(cls);
      setAssignments(asgn);
      setStats(DB.computeStats(asgn));
      setStreak(touchStreak(u.id));
      setTodayStudied(loadTodayStudied(u.id));
      setLoading(false);
      setTimeout(() => setMounted(true), 60);
      // Check subscription
      try {
        const subRes = await fetch(`/api/subscription?userId=${u.id}`);
        const sub = await subRes.json();
        setIsPro(sub.pro);
      } catch {}
    }
    load();
  }, []);

  const c1 = useCountUp(stats.dueToday, mounted);
  const c2 = useCountUp(stats.dueThisWeek, mounted);
  const c3 = useCountUp(stats.upcoming, mounted);
  const c4 = useCountUp(stats.completed, mounted);

  function getWeekDays() {
    const days = [];
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const count = assignments.filter(a => !a.completed && a.dueDate === dateStr).length;
      days.push({ date: d, dateStr, count, isToday: i === 0 });
    }
    return days;
  }

  function getTodayPlan() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().split('T')[0];
    const P = { high: 0, medium: 1, low: 2 };
    const overdue = assignments.filter(a => !a.completed && new Date(a.dueDate + 'T00:00:00') < now).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const dueToday = assignments.filter(a => !a.completed && a.dueDate === todayStr).sort((a, b) => P[a.priority] - P[b.priority]);
    const upcoming = assignments.filter(a => !a.completed && a.dueDate > todayStr).sort((a, b) => a.dueDate !== b.dueDate ? a.dueDate.localeCompare(b.dueDate) : P[a.priority] - P[b.priority]);
    return [...overdue, ...dueToday, ...upcoming].slice(0, 5);
  }

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDays = getWeekDays();
  const todayPlan = getTodayPlan();
  const totalAssignments = stats.completed + stats.upcoming;
  const completionPct = totalAssignments > 0 ? Math.round((stats.completed / totalAssignments) * 100) : 0;
  const totalEstimated = todayPlan.reduce((s, a) => s + (parseFloat(a.estimatedTime) || 0), 0);
  const studyHours = Math.floor(todayStudied / 60);
  const studyStr = studyHours > 0 ? `${studyHours}h ${todayStudied % 60}m` : `${todayStudied}m`;
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (completionPct / 100) * circumference;

  function getClass(id) { return classes.find(c => c.id === id); }

  if (loading) {
    return (
      <AppLayout title="Dashboard" user={user}>
        <div className="db-skeleton">
          <div className="db-skel-hero" />
          <div className="db-skel-stats">
            {[...Array(4)].map((_, i) => <div key={i} className="db-skel-card" />)}
          </div>
          <div className="db-skel-grid">
            <div className="db-skel-panel" />
            <div className="db-skel-panel" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" user={user}>

      {/* ── Onboarding ── shown only when user has no classes yet */}
      {classes.length === 0 && (
        <div style={{
          margin: '0 0 24px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1.5px solid #bbf7d0',
          borderRadius: 16,
          padding: '28px 32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>👋</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#14532d', marginBottom: 6 }}>
                Welcome to duee. — let's get you set up
              </div>
              <div style={{ fontSize: 14, color: '#166534', marginBottom: 20, lineHeight: 1.6 }}>
                You're 2 steps away from never missing a deadline again.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/classes" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: '#16a34a', color: 'white', borderRadius: 10,
                  padding: '11px 20px', fontWeight: 700, fontSize: 14, width: 'fit-content',
                  boxShadow: '0 4px 14px rgba(22,163,74,.3)',
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Step 1 — Add your first class
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontSize: 13 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Or just tell the AI: "Add my Chemistry class on Mondays"
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#166534', minWidth: 160 }}>
              {[['Add classes', true], ['Add assignments', false], ['AI study help', false]].map(([step, done]) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: done ? '#16a34a' : '#bbf7d0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', opacity: .4 }} />
                    }
                  </div>
                  <span style={{ opacity: done ? 1 : .6 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Banner ── */}
      <div className="db-hero">
        <div className="db-hero-orb" />
        <div className="db-hero-grid" />

        <div className="db-hero-left">
          <div className={`db-greeting-line ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '0ms' }}>
            <h1 className="db-greeting">{getGreeting()}, {Auth.getUserName(user)}</h1>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: .7, flexShrink: 0 }}>
              <path d="M18 11V6.6a.6.6 0 0 0-1.2 0V11"/><path d="M15 12V5.6a.6.6 0 0 0-1.2 0V12"/><path d="M12 11.4V4.6a.6.6 0 0 0-1.2 0V14"/><path d="M9 11V7.6a.6.6 0 0 0-1.2 0v5.9l-.9-1.6a.6.6 0 0 0-1 .6l1.7 4.4A5 5 0 0 0 12 21a5 5 0 0 0 5-5v-5"/>
            </svg>
          </div>
          <div className={`db-date ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '60ms' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div className={`db-hero-badges ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '120ms' }}>
            {streak.streak > 0 && (
              <div className="db-hero-badge db-badge-streak">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M12 2c0 0-5.5 5.5-5.5 10.5a5.5 5.5 0 0 0 11 0C17.5 7.5 12 2 12 2z"/></svg>
                <span><strong>{streak.streak}</strong> day streak</span>
              </div>
            )}
            {todayStudied > 0 && (
              <div className="db-hero-badge db-badge-study">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span><strong>{studyStr}</strong> studied</span>
              </div>
            )}
            {stats.dueToday > 0 && (
              <div className="db-hero-badge db-badge-due">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span><strong>{stats.dueToday}</strong> due today</span>
              </div>
            )}
          </div>
        </div>

        <div className={`db-hero-right ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '100ms' }}>
          {totalAssignments > 0 ? (
            <div className="db-ring-wrap">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="#4ade80" strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={mounted ? dashOffset : circumference}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px', transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }}
                />
              </svg>
              <div className="db-ring-label">
                <div className="db-ring-pct">{completionPct}%</div>
                <div className="db-ring-sub">done</div>
              </div>
            </div>
          ) : (
            <div className="db-ring-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 8 }}>Nothing yet</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="db-stats">
        {[
          { label: 'Due Today', val: c1, color: '#dc2626', bg: 'linear-gradient(135deg,#7f1d1d22,#fee2e2)', border: '#fecaca', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: 'This Week', val: c2, color: '#d97706', bg: 'linear-gradient(135deg,#78350f22,#fef3c7)', border: '#fde68a', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
          { label: 'Upcoming', val: c3, color: '#2563eb', bg: 'linear-gradient(135deg,#1e3a8a22,#dbeafe)', border: '#bfdbfe', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
          { label: 'Completed', val: c4, color: '#16a34a', bg: 'linear-gradient(135deg,#14532d22,#dcfce7)', border: '#bbf7d0', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> },
        ].map((s, i) => (
          <div
            key={i}
            className={`db-stat-card ${mounted ? 'db-in' : ''}`}
            style={{ background: s.bg, border: `1px solid ${s.border}`, transitionDelay: `${i * 60}ms` }}
          >
            <div className="db-stat-top">
              <span className="db-stat-label">{s.label}</span>
              <div className="db-stat-icon">{s.icon}</div>
            </div>
            <div className="db-stat-num" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── Today's Plan ── */}
      {todayPlan.length > 0 && (
        <div className={`db-card db-plan-card ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '300ms' }}>
          <div className="db-card-header">
            <div className="db-card-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Today&apos;s Plan
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {totalEstimated > 0 && (
                <span className="db-est-time">~{totalEstimated.toFixed(1)}h total</span>
              )}
              <Link href="/assignments" className="db-view-all">View all →</Link>
            </div>
          </div>
          <div className="db-plan-list">
            {todayPlan.map((a, idx) => {
              const cls = getClass(a.classId);
              const due = getDaysUntil(a.dueDate);
              const isOverdue = due.cls === 'overdue';
              const isDueToday = due.label === 'Due today';
              const accentColor = isOverdue ? '#dc2626' : isDueToday ? '#d97706' : '#94a3b8';
              const priorityMeta = {
                high:   { bg: '#fee2e2', color: '#dc2626', label: 'High' },
                medium: { bg: '#fef9c3', color: '#854d0e', label: 'Med' },
                low:    { bg: '#dcfce7', color: '#166534', label: 'Low' },
              }[a.priority];
              return (
                <div key={a.id} className="db-plan-row" style={{ borderLeft: `3px solid ${accentColor}` }}>
                  <div className="db-plan-idx" style={{ color: accentColor }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="db-plan-name">{a.name}</div>
                    <div className="db-plan-meta">
                      {cls && <span style={{ color: cls.color, fontWeight: 600 }}>{cls.name}</span>}
                      {cls && <span className="db-dot">·</span>}
                      <span>{a.estimatedTime}h est.</span>
                    </div>
                  </div>
                  <div className={`db-plan-due${isOverdue ? ' overdue' : ''}`}>{due.label}</div>
                  <div className="db-plan-badge" style={{ background: priorityMeta.bg, color: priorityMeta.color }}>
                    {priorityMeta.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="db-grid">
        {/* Upcoming Assignments */}
        <div className={`db-card ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '360ms' }}>
          <div className="db-card-header">
            <div className="db-card-title">Upcoming Assignments</div>
            <Link href="/assignments" className="db-view-all">View all →</Link>
          </div>
          {assignments.filter(a => !a.completed).length === 0 ? (
            <div className="db-empty">
              <div className="db-empty-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div className="db-empty-title">All caught up!</div>
              <div className="db-empty-sub">No upcoming assignments</div>
            </div>
          ) : (
            <div className="db-asgn-list">
              {assignments.filter(a => !a.completed).slice(0, 5).map(a => {
                const cls = getClass(a.classId);
                const due = getDaysUntil(a.dueDate);
                const isOverdue = due.cls === 'overdue';
                const isDueToday = due.label === 'Due today';
                const stripe = isOverdue ? '#dc2626' : isDueToday ? '#d97706' : 'var(--border)';
                return (
                  <div key={a.id} className="db-asgn-row" style={{ borderLeft: `3px solid ${stripe}` }}>
                    <div className="db-asgn-dot" style={{ background: cls?.color || 'var(--border)' }} />
                    <div className="db-asgn-info">
                      <div className="db-asgn-name">{a.name}</div>
                      {cls && <div className="db-asgn-class" style={{ color: cls.color }}>{cls.name}</div>}
                    </div>
                    <div className={`db-asgn-due${isOverdue ? ' overdue' : ''}`}>{due.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Your Classes */}
        <div className={`db-card ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '420ms' }}>
          <div className="db-card-header">
            <div className="db-card-title">Your Classes</div>
            <Link href="/classes" className="db-view-all">View all →</Link>
          </div>
          {classes.length === 0 ? (
            <div className="db-empty">
              <div className="db-empty-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div className="db-empty-title">No classes yet</div>
              <div className="db-empty-sub">Add your first class to get started</div>
            </div>
          ) : classes.slice(0, 4).map(cls => {
            const pending = assignments.filter(a => a.classId === cls.id && !a.completed).length;
            const total = assignments.filter(a => a.classId === cls.id).length;
            const pct = total > 0 ? (total - pending) / total : 0;
            return (
              <div key={cls.id} className="db-cls-row">
                <div className="db-cls-icon" style={{ background: cls.color + '22', color: cls.color }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div className="db-cls-info">
                  <div className="db-cls-name">{cls.name}</div>
                  {total > 0 && (
                    <div className="db-cls-bar-wrap">
                      <div className="db-cls-bar-track">
                        <div className="db-cls-bar-fill" style={{ width: `${pct * 100}%`, background: cls.color }} />
                      </div>
                      <span className="db-cls-count">{total - pending}/{total}</span>
                    </div>
                  )}
                </div>
                <div className="db-cls-pending" style={{ color: pending > 0 ? 'var(--text-secondary)' : 'var(--green)' }}>
                  {pending > 0 ? `${pending} left` : 'Done ✓'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Row: Streak / Study / Grades ── */}
      <div className={`db-bottom-row ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '480ms' }}>

        {/* Streak */}
        <div className="db-bottom-card db-streak-card">
          <div className="db-streak-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8">
              <path d="M12 2c0 0-5.5 5.5-5.5 10.5a5.5 5.5 0 0 0 11 0C17.5 7.5 12 2 12 2z"/>
              <path d="M12 12c0 0-2.5 2.5-2.5 4.5a2.5 2.5 0 0 0 5 0C14.5 14.5 12 12 12 12z" fill="#fb923c" opacity=".4"/>
            </svg>
          </div>
          <div>
            <div className="db-bottom-num" style={{ color: '#f97316' }}>{streak.streak}</div>
            <div className="db-bottom-lbl">day streak</div>
          </div>
          {streak.best > 1 && (
            <div className="db-streak-best">
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>{streak.best}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>best</div>
            </div>
          )}
        </div>

        {/* Study time */}
        <div className="db-bottom-card">
          <div className="db-bottom-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div className="db-bottom-num" style={{ color: todayStudied > 0 ? '#2563eb' : 'var(--text-muted)' }}>
              {todayStudied > 0 ? studyStr : '—'}
            </div>
            <div className="db-bottom-lbl">studied today</div>
          </div>
          {todayStudied === 0 && <div className="db-bottom-hint">open timer →</div>}
        </div>

        {/* Grades */}
        <Link href="/grades" className="db-bottom-card db-grades-card">
          <div className="db-bottom-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Grade Calculator</div>
            <div className="db-bottom-lbl">Track & project your grades</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', color: 'var(--text-muted)', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      </div>

      {/* ── Pro upgrade banner ── */}
      {!isPro && (
        <div className={`db-pro-banner ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '540ms' }}>
          <div className="db-pro-left">
            <span className="db-pro-badge">⚡ Pro</span>
            <div>
              <div className="db-pro-title">Unlock unlimited AI + image analysis</div>
              <div className="db-pro-sub">Paste a screenshot of any assignment and get instant help. Unlimited messages.</div>
            </div>
          </div>
          <Link href="/pricing" className="db-pro-btn">Upgrade →</Link>
        </div>
      )}

      {/* ── Week Strip ── */}
      <div className={`db-week-card ${mounted ? 'db-in' : ''}`} style={{ transitionDelay: '540ms' }}>
        <div className="db-card-header">
          <div className="db-card-title">This Week</div>
          <Link href="/calendar" className="db-view-all">Open calendar →</Link>
        </div>
        <div className="db-week-strip">
          {weekDays.map((day, i) => (
            <Link key={i} href="/calendar" className={`db-week-day${day.isToday ? ' today' : ''}${day.count > 0 && !day.isToday ? ' has-tasks' : ''}`}>
              <div className="db-week-dow">{DOW[day.date.getDay()]}</div>
              <div className="db-week-num">{day.date.getDate()}</div>
              <div className="db-week-indicator">
                {day.count > 0 ? (
                  <div className="db-week-dot" title={`${day.count} assignment${day.count > 1 ? 's' : ''}`}>
                    {day.count}
                  </div>
                ) : <div style={{ height: 20 }} />}
              </div>
            </Link>
          ))}
        </div>
      </div>

    </AppLayout>
  );
}
