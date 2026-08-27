'use client';
import { useEffect, useState } from 'react';
import { Auth } from '../../lib/auth';
import { DB } from '../../lib/data';
import AppLayout from '../../components/AppLayout';
import { initTheme } from '../../lib/utils';

export default function StatisticsPage() {
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initTheme();
    async function load() {
      const session = await Auth.requireAuth();
      if (!session) return;
      setUser(session.user);
      const [cls, asgn] = await Promise.all([
        DB.getClasses(session.user.id),
        DB.getAssignments(session.user.id),
      ]);
      setClasses(cls);
      setAssignments(asgn);
      setLoading(false);
    }
    load();
  }, []);

  const total = assignments.length;
  const completed = assignments.filter(a => a.completed).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 54; // radius 54

  // Priority breakdown
  const high = assignments.filter(a => a.priority === 'high').length;
  const medium = assignments.filter(a => a.priority === 'medium').length;
  const low = assignments.filter(a => a.priority === 'low').length;

  // Class breakdown
  const classStats = classes.map(c => ({
    ...c,
    total: assignments.filter(a => a.classId === c.id).length,
    done: assignments.filter(a => a.classId === c.id && a.completed).length,
  })).filter(c => c.total > 0);

  // Weekly trend (last 7 days)
  function getWeeklyTrend() {
    const days = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const done = assignments.filter(a => a.completed && a.dueDate === ds).length;
      days.push({ label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], done });
    }
    return days;
  }

  const weeklyTrend = getWeeklyTrend();
  const maxTrend = Math.max(...weeklyTrend.map(d => d.done), 1);

  if (loading) return <AppLayout title="Statistics" user={user}><div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div></AppLayout>;

  return (
    <AppLayout title="Statistics" user={user}>
      <div className="page-header">
        <h2>Statistics</h2>
      </div>

      <div className="stats-full-grid">
        {/* Completion rate */}
        <div className="stats-full-card">
          <h3>Completion Rate</h3>
          <div className="circle-stat">
            <div className="circle-wrap">
              <svg className="circle-svg" width="140" height="140" viewBox="0 0 140 140">
                <circle className="circle-track" cx="70" cy="70" r="54" />
                <circle
                  className="circle-fill"
                  cx="70" cy="70" r="54"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (completionRate / 100) * circumference}
                />
              </svg>
              <div className="circle-label">
                <div className="circle-pct" style={{ color: completionRate >= 70 ? 'var(--green)' : completionRate >= 40 ? 'var(--yellow)' : 'var(--red)' }}>{completionRate}%</div>
                <div className="circle-sub">completed</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 0, justifyContent: 'center', background: 'var(--bg-main)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {[
                { label: 'Done', value: completed, color: 'var(--green)' },
                { label: 'Left', value: total - completed, color: 'var(--blue)' },
                { label: 'Total', value: total, color: 'var(--text-primary)' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="stats-full-card">
          <h3>Priority Breakdown</h3>
          {[
            { label: 'High Priority', count: high, color: 'var(--red)' },
            { label: 'Medium Priority', count: medium, color: 'var(--yellow)' },
            { label: 'Low Priority', count: low, color: 'var(--green)' },
          ].map(p => (
            <div className="progress-bar-wrap" key={p.label}>
              <div className="progress-bar-label">
                <span>{p.label}</span>
                <span>{p.count} assignments</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: total > 0 ? `${(p.count / total) * 100}%` : '0%', background: p.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Class breakdown */}
        <div className="stats-full-card">
          <h3>By Class</h3>
          {classStats.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No class data yet</div>
          ) : classStats.map(c => (
            <div className="progress-bar-wrap" key={c.id}>
              <div className="progress-bar-label">
                <span>{c.name}</span>
                <span>{c.done}/{c.total} done</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${c.total > 0 ? (c.done / c.total) * 100 : 0}%`, background: c.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Weekly trend */}
        <div className="stats-full-card">
          <h3>Weekly Completion Trend</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130, marginTop: 20, paddingBottom: 4 }}>
            {weeklyTrend.map((d, i) => {
              const barH = Math.max((d.done / maxTrend) * 90, d.done > 0 ? 10 : 5);
              const isToday = i === weeklyTrend.length - 1;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  {d.done > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>{d.done}</div>}
                  <div style={{
                    width: '100%', borderRadius: '6px 6px 3px 3px',
                    background: d.done > 0
                      ? isToday ? 'linear-gradient(180deg,#4ade80,#16a34a)' : 'linear-gradient(180deg,#86efac,#16a34a)'
                      : 'var(--border)',
                    height: `${barH}px`, transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                  <div style={{ fontSize: 10, color: isToday ? 'var(--green)' : 'var(--text-muted)', fontWeight: isToday ? 700 : 600, textTransform: 'uppercase' }}>{d.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
