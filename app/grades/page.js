'use client';
import { useEffect, useState } from 'react';
import { Auth } from '../../lib/auth';
import { DB } from '../../lib/data';
import AppLayout from '../../components/AppLayout';
import { initTheme } from '../../lib/utils';

const GRADE_KEY = (uid, cid) => `duee_grades_${uid}_${cid}`;

function loadGrades(uid, cid) {
  try { return JSON.parse(localStorage.getItem(GRADE_KEY(uid, cid))) || []; }
  catch { return []; }
}
function saveGrades(uid, cid, entries) {
  localStorage.setItem(GRADE_KEY(uid, cid), JSON.stringify(entries));
}

function computeGrade(entries) {
  if (!entries.length) return null;
  const hasWeight = entries.some(e => e.weight > 0);
  if (hasWeight) {
    const totalWeight = entries.reduce((s, e) => s + (e.weight || 0), 0);
    if (!totalWeight) return null;
    const weighted = entries.reduce((s, e) => {
      const pct = e.possible > 0 ? (e.earned / e.possible) * 100 : 0;
      return s + pct * (e.weight || 0);
    }, 0);
    return weighted / totalWeight;
  }
  const totalPossible = entries.reduce((s, e) => s + (e.possible || 0), 0);
  const totalEarned = entries.reduce((s, e) => s + (e.earned || 0), 0);
  return totalPossible > 0 ? (totalEarned / totalPossible) * 100 : null;
}

function letterGrade(pct) {
  if (pct >= 93) return 'A';  if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+'; if (pct >= 83) return 'B';
  if (pct >= 80) return 'B-'; if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';  if (pct >= 70) return 'C-';
  if (pct >= 67) return 'D+'; if (pct >= 60) return 'D';
  return 'F';
}

function gradeColor(pct) {
  if (pct >= 80) return 'var(--green)';
  if (pct >= 70) return 'var(--yellow)';
  return 'var(--red)';
}

export default function GradesPage() {
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entryForm, setEntryForm] = useState({ name: '', earned: '', possible: '', weight: '' });
  const [examWeight, setExamWeight] = useState('');
  const [targetGrade, setTargetGrade] = useState('');

  useEffect(() => {
    initTheme();
    async function load() {
      const session = await Auth.requireAuth();
      if (!session) return;
      setUser(session.user);
      const cls = await DB.getClasses(session.user.id);
      setClasses(cls);
      if (cls.length > 0) {
        setSelectedClass(cls[0]);
        setEntries(loadGrades(session.user.id, cls[0].id));
      }
      setLoading(false);
    }
    load();
  }, []);

  function selectClass(cls) {
    setSelectedClass(cls);
    setEntries(loadGrades(user.id, cls.id));
    setEntryForm({ name: '', earned: '', possible: '', weight: '' });
    setExamWeight(''); setTargetGrade('');
  }

  function addEntry(e) {
    e.preventDefault();
    if (!entryForm.name || entryForm.earned === '' || entryForm.possible === '') return;
    const newEntry = {
      id: Date.now().toString(),
      name: entryForm.name,
      earned: parseFloat(entryForm.earned),
      possible: parseFloat(entryForm.possible),
      weight: parseFloat(entryForm.weight) || 0,
    };
    const updated = [...entries, newEntry];
    setEntries(updated);
    saveGrades(user.id, selectedClass.id, updated);
    setEntryForm({ name: '', earned: '', possible: '', weight: '' });
  }

  function removeEntry(id) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveGrades(user.id, selectedClass.id, updated);
  }

  const currentGrade = computeGrade(entries);

  let neededScore = null;
  if (currentGrade !== null && examWeight && targetGrade) {
    const ew = parseFloat(examWeight) / 100;
    const tg = parseFloat(targetGrade);
    neededScore = (tg - currentGrade * (1 - ew)) / ew;
  }

  const circumference = 2 * Math.PI * 33;

  if (loading) return <AppLayout title="Grades" user={user}><div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div></AppLayout>;

  return (
    <AppLayout title="Grades" user={user}>
      <div className="page-header">
        <h2>Grade Calculator</h2>
      </div>

      {classes.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <div className="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <h3>No classes yet</h3>
          <p>Add your classes first to start tracking grades</p>
        </div>
      ) : (
        <div className="grades-layout">
          {/* Class list */}
          <div className="grades-sidebar">
            <div className="grades-sidebar-title">Your Classes</div>
            {classes.map(cls => {
              const g = computeGrade(loadGrades(user.id, cls.id));
              return (
                <button
                  key={cls.id}
                  className={`grades-cls-btn${selectedClass?.id === cls.id ? ' active' : ''}`}
                  onClick={() => selectClass(cls)}
                >
                  <div className="grades-cls-dot" style={{ background: cls.color }} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{cls.name}</div>
                    {g !== null && (
                      <div style={{ fontSize: 11, color: gradeColor(g), fontWeight: 700 }}>{g.toFixed(1)}% · {letterGrade(g)}</div>
                    )}
                    {g === null && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No entries</div>}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedClass && (
            <div className="grades-main">
              {/* Big grade display */}
              <div className="grade-display-card" style={{ borderTop: `4px solid ${selectedClass.color}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{selectedClass.name} — Current Grade</div>
                  {currentGrade !== null ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <div style={{ fontSize: 56, fontWeight: 800, color: gradeColor(currentGrade), lineHeight: 1 }}>{currentGrade.toFixed(1)}%</div>
                      <div style={{ fontSize: 30, fontWeight: 800, color: gradeColor(currentGrade) }}>{letterGrade(currentGrade)}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 22, color: 'var(--text-muted)', fontWeight: 600 }}>Add your first grade below</div>
                  )}
                  {currentGrade !== null && (
                    <div style={{ marginTop: 10, height: 6, background: 'var(--border)', borderRadius: 99, width: 200, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(currentGrade, 100)}%`, background: gradeColor(currentGrade), borderRadius: 99, transition: 'width .6s ease' }} />
                    </div>
                  )}
                </div>
                {currentGrade !== null && (
                  <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="33" fill="none" stroke="var(--border)" strokeWidth="7"/>
                      <circle cx="40" cy="40" r="33" fill="none" stroke={gradeColor(currentGrade)} strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - Math.min(currentGrade, 100) / 100)}
                        strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px', transition: 'stroke-dashoffset .6s ease' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: gradeColor(currentGrade) }}>
                      {letterGrade(currentGrade)}
                    </div>
                  </div>
                )}
              </div>

              {/* Grade entries table */}
              <div className="grades-card">
                <div className="grades-card-header">
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Grade Entries</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fill Weight % for weighted grades (exams, quizzes, etc.)</div>
                </div>

                {entries.length > 0 && (
                  <div className="grades-table">
                    <div className="grades-table-head">
                      <span>Assignment</span><span>Earned</span><span>Possible</span><span>Score</span><span>Weight</span><span />
                    </div>
                    {entries.map(e => {
                      const pct = e.possible > 0 ? (e.earned / e.possible) * 100 : 0;
                      return (
                        <div key={e.id} className="grades-table-row">
                          <span style={{ fontWeight: 500 }}>{e.name}</span>
                          <span>{e.earned}</span>
                          <span>{e.possible}</span>
                          <span style={{ color: gradeColor(pct), fontWeight: 700 }}>{pct.toFixed(1)}%</span>
                          <span style={{ color: 'var(--text-muted)' }}>{e.weight > 0 ? `${e.weight}%` : '—'}</span>
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red)' }} onClick={() => removeEntry(e.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={addEntry} className="grades-add-row">
                  <input className="form-control" placeholder="Assignment / exam name" value={entryForm.name} onChange={e => setEntryForm(f => ({ ...f, name: e.target.value }))} required style={{ flex: 2 }} />
                  <input className="form-control" type="number" placeholder="Earned" min="0" step="0.01" value={entryForm.earned} onChange={e => setEntryForm(f => ({ ...f, earned: e.target.value }))} required style={{ flex: 1 }} />
                  <input className="form-control" type="number" placeholder="/ Possible" min="0" step="0.01" value={entryForm.possible} onChange={e => setEntryForm(f => ({ ...f, possible: e.target.value }))} required style={{ flex: 1 }} />
                  <input className="form-control" type="number" placeholder="Weight %" min="0" max="100" step="0.5" value={entryForm.weight} onChange={e => setEntryForm(f => ({ ...f, weight: e.target.value }))} style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-primary btn-sm">Add</button>
                </form>
              </div>

              {/* Final exam calculator */}
              <div className="grades-card">
                <div className="grades-card-header">
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    Final Exam Calculator
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>What do you need on your final to hit a target grade?</div>
                </div>
                <div className="grades-calc-row">
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label>Final Exam Weight (%)</label>
                    <input className="form-control" type="number" min="1" max="100" placeholder="e.g. 30" value={examWeight} onChange={e => setExamWeight(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label>Target Final Grade (%)</label>
                    <input className="form-control" type="number" min="0" max="100" placeholder="e.g. 90" value={targetGrade} onChange={e => setTargetGrade(e.target.value)} />
                  </div>
                  {neededScore !== null && (
                    <div className="grades-result">
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>You need on final</div>
                      <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, color: neededScore > 100 ? 'var(--red)' : neededScore < 0 ? 'var(--green)' : gradeColor(neededScore) }}>
                        {neededScore > 100 ? 'Impossible' : neededScore < 0 ? 'Already set!' : `${neededScore.toFixed(1)}%`}
                      </div>
                      {neededScore >= 0 && neededScore <= 100 && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>to earn a {letterGrade(parseFloat(targetGrade))} in {selectedClass.name}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
