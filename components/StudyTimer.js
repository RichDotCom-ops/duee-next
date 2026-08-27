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

const DEFAULT_WORK = 25;
const DEFAULT_BREAK = 5;

export default function StudyTimer() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState('work');
  const [workMins, setWorkMins] = useState(DEFAULT_WORK);
  const [breakMins, setBreakMins] = useState(DEFAULT_BREAK);
  const [seconds, setSeconds] = useState(DEFAULT_WORK * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [todayMins, setTodayMins] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [draftWork, setDraftWork] = useState(DEFAULT_WORK);
  const [draftBreak, setDraftBreak] = useState(DEFAULT_BREAK);

  const intervalRef = useRef(null);
  const modeRef = useRef('work');
  const workRef = useRef(DEFAULT_WORK);
  const breakRef = useRef(DEFAULT_BREAK);
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
      showToast(`${workRef.current} min session complete! Take a break.`, 'success');
      setMode('break');
      setSeconds(breakRef.current * 60);
    } else {
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

  function applySettings() {
    setWorkMins(draftWork); setBreakMins(draftBreak);
    workRef.current = draftWork; breakRef.current = draftBreak;
    setRunning(false);
    setMode('work');
    setSeconds(draftWork * 60);
    setShowSettings(false);
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
            <div style={{ display: 'flex', gap: 4 }}>
              {todayMins > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 6px', alignSelf: 'center' }}>
                  {todayStr} today
                </span>
              )}
              <button className="ai-close-btn" onClick={() => setShowSettings(s => !s)} title="Settings">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
              <button className="ai-close-btn" onClick={() => setOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {showSettings ? (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 12 }}>Work session (minutes)</label>
                <input className="form-control" type="number" min="1" max="120" value={draftWork} onChange={e => setDraftWork(Number(e.target.value))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 12 }}>Break duration (minutes)</label>
                <input className="form-control" type="number" min="1" max="60" value={draftBreak} onChange={e => setDraftBreak(Number(e.target.value))} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={applySettings}>Apply</button>
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
                    {mode === 'work' ? 'Focus' : 'Break'}
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
                <button className="timer-ctrl-btn" onClick={reset} title="Reset" disabled={running && seconds === (mode === 'work' ? workMins : breakMins) * 60}>
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
