'use client';
import { useEffect, useState } from 'react';
import { Auth } from '../../lib/auth';
import { DB } from '../../lib/data';
import AppLayout from '../../components/AppLayout';
import { showToast, initTheme } from '../../lib/utils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const emptyForm = { name: '', classId: '', dueDate: '', dueTime: '23:59', priority: 'medium', estimatedTime: '1.5', notes: '' };

export default function CalendarPage() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [current, setCurrent] = useState(new Date());

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Day detail panel (click on a cell)
  const [selectedDate, setSelectedDate] = useState(null);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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

  function navigate(dir) {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrent(d);
  }

  function getTitle() {
    if (view === 'month') return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === 'week') {
      const start = new Date(current);
      start.setDate(current.getDate() - current.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    }
    return current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function getAssignmentsForDate(dateStr) {
    return assignments.filter(a => a.dueDate === dateStr);
  }

  function getClass(classId) { return classes.find(c => c.id === classId); }

  function openAdd(dateStr) {
    setForm({ ...emptyForm, dueDate: dateStr || DB.todayStr() });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(a, e) {
    e?.stopPropagation();
    setForm({ name: a.name, classId: a.classId || '', dueDate: a.dueDate, dueTime: a.dueTime, priority: a.priority, estimatedTime: a.estimatedTime, notes: a.notes || '' });
    setEditingId(a.id);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.dueDate) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await DB.updateAssignment(editingId, form);
        setAssignments(list => list.map(x => x.id === editingId ? updated : x));
        showToast('Assignment updated', 'success');
      } else {
        const newA = await DB.addAssignment(user.id, form);
        setAssignments(list => [...list, newA]);
        showToast('Assignment added', 'success');
      }
      setModalOpen(false);
    } catch {
      showToast('Error saving assignment', 'error');
    } finally {
      setSaving(false);
    }
  }

  function askDelete(id, e) {
    e?.stopPropagation();
    setDeleteId(id);
    setConfirmOpen(true);
  }

  async function handleDelete() {
    try {
      await DB.deleteAssignment(deleteId);
      setAssignments(list => list.filter(a => a.id !== deleteId));
      showToast('Assignment deleted');
    } catch { showToast('Error deleting', 'error'); }
    setConfirmOpen(false);
  }

  async function toggleComplete(a, e) {
    e?.stopPropagation();
    const updated = await DB.toggleComplete(a.id, a.completed);
    setAssignments(list => list.map(x => x.id === a.id ? updated : x));
    showToast(updated.completed ? 'Marked complete!' : 'Marked incomplete', 'success');
  }

  // Month view
  function renderMonth() {
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const cells = [];
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevDays - i), isOtherMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), isOtherMonth: false });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), isOtherMonth: true });
    }

    return (
      <div className="cal-month">
        <div className="cal-month-header">
          {DAYS.map(d => <div key={d} className="cal-dow">{d}</div>)}
        </div>
        <div className="cal-month-grid">
          {cells.map((cell, i) => {
            const ds = cell.date.toISOString().split('T')[0];
            const isToday = cell.date.getTime() === today.getTime();
            const asgns = getAssignmentsForDate(ds);
            const isSelected = selectedDate === ds;
            return (
              <div
                key={i}
                className={`cal-cell clickable${isToday ? ' today' : ''}${cell.isOtherMonth ? ' other-month' : ''}${isSelected ? ' cal-cell-selected' : ''}`}
                onClick={() => setSelectedDate(isSelected ? null : ds)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="cal-cell-num">{cell.date.getDate()}</div>
                  {!cell.isOtherMonth && (
                    <button
                      className="cal-cell-add"
                      onClick={e => { e.stopPropagation(); openAdd(ds); }}
                      title="Add assignment"
                    >+</button>
                  )}
                </div>
                {asgns.slice(0, 3).map(a => {
                  const cls = getClass(a.classId);
                  return (
                    <div
                      key={a.id}
                      className="cal-event"
                      style={{
                        borderLeftColor: cls?.color || 'var(--green)',
                        background: (cls?.color || '#16a34a') + '22',
                        color: cls?.color || 'var(--green)',
                        opacity: a.completed ? 0.5 : 1,
                        textDecoration: a.completed ? 'line-through' : 'none',
                      }}
                      onClick={e => { e.stopPropagation(); openEdit(a, e); }}
                      title={a.name}
                    >
                      {a.name}
                    </div>
                  );
                })}
                {asgns.length > 3 && <div className="cal-more">+{asgns.length - 3} more</div>}
              </div>
            );
          })}
        </div>

        {/* Day detail panel */}
        {selectedDate && (() => {
          const asgns = getAssignmentsForDate(selectedDate);
          const d = new Date(selectedDate + 'T00:00:00');
          return (
            <div className="cal-day-panel">
              <div className="cal-day-panel-header">
                <span className="cal-day-panel-title">
                  {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => openAdd(selectedDate)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
              {asgns.length === 0 ? (
                <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 13 }}>Nothing due — click Add to schedule something.</div>
              ) : asgns.map(a => {
                const cls = getClass(a.classId);
                return (
                  <div key={a.id} className="cal-panel-item">
                    <div
                      className={`cal-panel-check${a.completed ? ' done' : ''}`}
                      onClick={() => toggleComplete(a)}
                    >
                      {a.completed && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{ width: 3, height: 36, borderRadius: 2, background: cls?.color || 'var(--green)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, opacity: a.completed ? 0.5 : 1, textDecoration: a.completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {cls?.name || 'No class'} · {a.dueTime} · <span style={{ textTransform: 'capitalize', color: a.priority === 'high' ? 'var(--red)' : a.priority === 'medium' ? 'var(--yellow)' : 'var(--green)', fontWeight: 600 }}>{a.priority}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(a)} title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red)' }} onClick={() => askDelete(a.id)} title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    );
  }

  // Week view
  function renderWeek() {
    const start = new Date(current);
    start.setDate(current.getDate() - current.getDay());
    start.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });

    return (
      <div className="cal-week">
        <div className="cal-week-header">
          <div className="cal-week-corner" />
          {weekDays.map((d, i) => {
            const isToday = d.getTime() === today.getTime();
            return (
              <div key={i} className={`cal-week-day-header${isToday ? ' today' : ''}`}>
                <div className="dow">{DAYS[d.getDay()]}</div>
                <div className="date">{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '12px 8px' }}>
          {weekDays.map((d, i) => {
            const ds = d.toISOString().split('T')[0];
            const asgns = getAssignmentsForDate(ds);
            const isToday = d.getTime() === today.getTime();
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--green)' : 'var(--text-muted)' }}>{DAYS[d.getDay()]} {d.getDate()}</div>
                  <button className="cal-week-add-btn" onClick={() => openAdd(ds)} title="Add assignment">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
                {asgns.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4, paddingBottom: 2 }}>—</div>
                ) : asgns.map(a => {
                  const cls = getClass(a.classId);
                  return (
                    <div key={a.id} className="cal-week-event-row">
                      <div
                        className="cal-event"
                        style={{
                          flex: 1,
                          marginBottom: 4,
                          cursor: 'pointer',
                          opacity: a.completed ? 0.5 : 1,
                          textDecoration: a.completed ? 'line-through' : 'none',
                          ...(cls ? { borderLeftColor: cls.color, background: cls.color + '22', color: cls.color } : {}),
                        }}
                        onClick={() => openEdit(a)}
                      >{a.name}</div>
                      <button className="cal-event-del-btn" onClick={() => askDelete(a.id)} title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Day view
  function renderDay() {
    const ds = current.toISOString().split('T')[0];
    const asgns = getAssignmentsForDate(ds);
    return (
      <div className="cal-day">
        <div className="cal-day-header">
          <div className="cal-day-title">{current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <button className="btn btn-primary btn-sm" onClick={() => openAdd(ds)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Assignment
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {asgns.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
              <h3>Nothing due</h3>
              <p>No assignments due on this day</p>
            </div>
          ) : asgns.map(a => {
            const cls = getClass(a.classId);
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div
                  className={`cal-panel-check${a.completed ? ' done' : ''}`}
                  onClick={() => toggleComplete(a)}
                >
                  {a.completed && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ width: 4, height: 40, borderRadius: 2, background: cls?.color || 'var(--green)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, opacity: a.completed ? 0.5 : 1, textDecoration: a.completed ? 'line-through' : 'none' }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {cls?.name || 'No class'} · {a.dueTime} · <span style={{ textTransform: 'capitalize', color: a.priority === 'high' ? 'var(--red)' : a.priority === 'medium' ? 'var(--yellow)' : 'var(--green)', fontWeight: 600 }}>{a.priority}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(a)} title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red)' }} onClick={() => askDelete(a.id)} title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) return <AppLayout title="Calendar" user={user}><div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div></AppLayout>;

  return (
    <AppLayout title="Calendar" user={user}>
      <div className="cal-header">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => navigate(-1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="cal-title">{getTitle()}</span>
          <button className="cal-nav-btn" onClick={() => navigate(1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setCurrent(new Date())}>Today</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={() => openAdd()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Assignment
          </button>
          <div className="cal-view-toggle">
            {['month', 'week', 'day'].map(v => (
              <button key={v} className={`cal-view-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'month' && renderMonth()}
      {view === 'week' && renderWeek()}
      {view === 'day' && renderDay()}

      {/* Add/Edit Modal */}
      <div className={`modal-overlay${modalOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">{editingId ? 'Edit Assignment' : 'Add Assignment'}</div>
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Assignment Name *</label>
              <input className="form-control" placeholder="e.g. Calculus Problem Set 4" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Class</label>
              <select className="form-control" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">No class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Due Date *</label>
                <input className="form-control" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Due Time</label>
                <input className="form-control" type="time" value={form.dueTime} onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label>Priority</label>
              <div className="priority-group">
                {['high', 'medium', 'low'].map(p => (
                  <div key={p} className={`priority-option ${p}`}>
                    <input type="radio" id={`cal-priority-${p}`} name="cal-priority" value={p} checked={form.priority === p} onChange={() => setForm(f => ({ ...f, priority: p }))} />
                    <label htmlFor={`cal-priority-${p}`}>
                      <span className="priority-dot" style={{ background: p === 'high' ? 'var(--red)' : p === 'medium' ? 'var(--yellow)' : 'var(--green)' }} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Estimated Time (hours)</label>
              <input className="form-control" type="number" min="0.5" max="20" step="0.5" value={form.estimatedTime} onChange={e => setForm(f => ({ ...f, estimatedTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea className="form-control" rows={3} placeholder="Any notes or details…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Assignment'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirm Delete */}
      <div className={`confirm-overlay${confirmOpen ? ' open' : ''}`}>
        <div className="confirm-box">
          <h3>Delete assignment?</h3>
          <p>This action cannot be undone.</p>
          <div className="confirm-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
