'use client';
import { useState, useEffect, useRef } from 'react';
import { Auth } from '../lib/auth';
import { DB } from '../lib/data';
import { showToast } from '../lib/utils';

const TODAY_KEY = uid => `duee_study_today_${uid}`;

function loadTodayMinutes(uid) {
  try {
    const data = JSON.parse(localStorage.getItem(TODAY_KEY(uid)));
    if (!data) return 0;
    const today = new Date().toISOString().split('T')[0];
    return data.date === today ? (data.minutes || 0) : 0;
  } catch { return 0; }
}

function addTodayMinutes(uid, mins) {
  const today = new Date().toISOString().split('T')[0];
  const current = loadTodayMinutes(uid);
  localStorage.setItem(TODAY_KEY(uid), JSON.stringify({ date: today, minutes: current + mins }));
}

function playAlarm(type = 'work') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const times = type === 'work' ? [0, 0.35, 0.7] : [0, 0.25];
    times.forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = type === 'work' ? 880 : 660;
      gain.gain.setValueAtTime(0, ctx.currentTime + offset);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.4);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.45);
    });
  } catch {}
}

const PRESETS = [
  { label: '25 / 5', work: 25, brk: 5 },
  { label: '50 / 10', work: 50, brk: 10 },
  { label: '90 / 20', work: 90, brk: 20 },
];

export default function StudyTimer() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState('work');
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [todayMins, setTodayMins] = useState(0);
  const [tab, setTab] = useState('timer'); // 'timer' | 'settings'
  const [draftWork, setDraftWork] = useState(25);
  const [draftBreak, setDraftBreak] = useState(5);

  const intervalRef = useRef(null);
  const modeRef = useRef('work');
  const workRef = useRef(25);
  const breakRef = useRef(5);
  const userRef = useRef(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { workRef.current = workMins; }, [workMins]);
  useEffect(() => { breakRef.current = breakMins; }, [breakMins]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    async function init() {
      const session = await Auth.getSession();
      if (!session?.user) return;
      setUser(session.user);
      setTodayMins(loadTodayMinutes(session.user.id));
      const asgn = await DB.getAssignments(session.user.id);
      setAssignments(asgn.filter(a => !a.completed));
    }
    init();
  }, []);

  function handleTimerEnd() {
    clearInterval(intervalRef.current);
    setRunning(false);
    const currentMode = modeRef.current;
    if (currentMode === 'work') {
      const uid = userRef.current?.id;
      if (uid) { addTodayMinutes(uid, workRef.current); setTodayMins(loadTodayMinutes(uid)); }
      setSessions(s => s + 1);
      playAlarm('work');
      showToast(`${workRef.current} min session complete! Take a break.`, 'success');
      setMode('break');
      setSeconds(breakRef.current * 60);
    } else {
      playAlarm('break');
      showToast('Break over — time to focus!', 'success');
      setMode('work');
      setSeconds(workRef.current * 60);
    }
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { handleTimerEnd(); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function reset() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setMode('work');
    setSeconds(workMins * 60);
  }

  function skip() { handleTimerEnd(); }

  function applyPreset(p) {
    setWorkMins(p.work); setBreakMins(p.brk);
    setDraftWork(p.work); setDraftBreak(p.brk);
    workRef.current = p.work; breakRef.current = p.brk;
    setRunning(false); setMode('work');
    setSeconds(p.work * 60);
  }

  function applySettings() {
    const w = Math.max(1, Math.min(180, draftWork));
    const b = Math.max(1, Math.min(60, draftBreak));
    setWorkMins(w); setBreakMins(b);
    workRef.current = w; breakRef.current = b;
    setRunning(false); setMode('work');
    setSeconds(w * 60);
    setTab('timer');
  }

  function switchMode(m) {
    setRunning(false);
    setMode(m);
    setSeconds(m === 'work' ? workMins * 60 : breakMins * 60);
  }

  const totalSecs = mode === 'work' ? workMins * 60 : breakMins * 60;
  const progress = totalSecs > 0 ? 1 - seconds / totalSecs : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const R = 44;
  const circumference = 2 * Math.PI * R;
  const hours = Math.floor(todayMins / 60);
  const remMins = todayMins % 60;
  const todayStr = hours > 0 ? `${hours}h ${remMins}m` : `${todayMins}m`;

  return (
    <>
      {open && (
        <div className="timer-panel">
          <div className="timer-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Study Timer</span>
              {sessions > 0 && (
                <span style={{ fontSize: 10, background: 'rgba(22,163,74,.15)', color: 'var(--green)', fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>
                  {sessions} done
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {todayMins > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 6px' }}>
                  {todayStr} today
                </span>
              )}
              <button className="ai-close-btn" onClick={() => setOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
            {['timer', 'settings'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? 'var(--green)' : 'var(--text-muted)',
                borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent',
                textTransform: 'capitalize', letterSpacing: '.02em',
              }}>
                {t === 'timer' ? 'Timer' : 'Customize'}
              </button>
            ))}
          </div>

          {tab === 'settings' ? (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Presets */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Quick presets</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRESETS.map(p => (
                    <button key={p.label} onClick={() => applyPreset(p)} style={{
                      flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700,
                      borderRadius: 8, border: '1.5px solid var(--border)',
                      background: workMins === p.work ? 'var(--green-100)' : 'white',
                      color: workMins === p.work ? 'var(--green)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}>{p.label}</button>
                  ))}
                </div>
              </div>

              {/* Custom inputs */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Custom duration</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Focus (min)</label>
                    <input
                      className="form-control"
                      type="number" min="1" max="180"
                      value={draftWork}
                      onChange={e => setDraftWork(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Break (min)</label>
                    <input
                      className="form-control"
                      type="number" min="1" max="60"
                      value={draftBreak}
                      onChange={e => setDraftBreak(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <button className="btn btn-primary btn-sm" onClick={applySettings} style={{ marginTop: 2 }}>
                Apply &amp; Reset Timer
              </button>

              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                An alarm will sound when each session ends.
              </p>
            </div>
          ) : (
            <div className="timer-body">
              <div className="timer-mode-row">
                <button className={`timer-mode-btn${mode === 'work' ? ' active' : ''}`} onClick={() => switchMode('work')}>Focus</button>
                <button className={`timer-mode-btn${mode === 'break' ? ' active' : ''}`} onClick={() => switchMode('break')}>Break</button>
              </div>

              <div className="timer-ring-wrap">
                <svg width="148" height="148" viewBox="0 0 148 148">
                  <circle cx="74" cy="74" r={R} fill="none" stroke="var(--border)" strokeWidth="8"/>
                  <circle cx="74" cy="74" r={R} fill="none"
                    stroke={mode === 'work' ? 'var(--green)' : 'var(--blue)'}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '74px 74px', transition: running ? 'stroke-dashoffset 1s linear' : 'none' }}
                  />
                </svg>
                <div className="timer-ring-label">
                  <div className="timer-time">{timeStr}</div>
                  <div className="timer-mode-label" style={{ color: mode === 'work' ? 'var(--green)' : 'var(--blue)' }}>
                    {mode === 'work' ? `Focus · ${workMins}m` : `Break · ${breakMins}m`}
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 16px 12px' }}>
                <select className="form-control" style={{ fontSize: 12 }} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                  <option value="">Working on… (optional)</option>
                  {assignments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="timer-controls">
                <button className="timer-ctrl-btn" onClick={reset} title="Reset">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                </button>
                <button className="timer-play-btn" onClick={() => setRunning(r => !r)}>
                  {running
                    ? <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  }
                </button>
                <button className="timer-ctrl-btn" onClick={skip} title="Skip to next">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        className={`timer-fab${open ? ' open' : ''}${running && !open ? ' running' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Study Timer"
        title="Study Timer"
      >
        {running && !open
          ? <span className="timer-fab-time">{timeStr}</span>
          : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        }
        {!open && !running && <span className="ai-fab-label">Timer</span>}
      </button>
    </>
  );
}
