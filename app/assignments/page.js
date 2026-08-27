'use client';
import { useEffect, useState } from 'react';
import { Auth } from '../../lib/auth';
import { DB } from '../../lib/data';
import AppLayout from '../../components/AppLayout';
import { showToast, fmtDate, getDaysUntil, initTheme, CLASS_COLORS } from '../../lib/utils';

const FILTERS = ['All', 'Due Today', 'This Week', 'Completed'];

const emptyForm = { name: '', classId: '', dueDate: '', dueTime: '23:59', priority: 'medium', estimatedTime: '1.5', notes: '' };

export default function AssignmentsPage() {
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
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

  function getFilteredAssignments() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const toD = s => { const d = new Date(s + 'T00:00:00'); d.setHours(0, 0, 0, 0); return d; };
    const wk = new Date(now); wk.setDate(wk.getDate() + 7);

    return assignments.filter(a => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'Due Today') return !a.completed && toD(a.dueDate).getTime() === now.getTime();
      if (filter === 'This Week') { const d = toD(a.dueDate); return !a.completed && d >= now && d < wk; }
      if (filter === 'Completed') return a.completed;
      return true;
    });
  }

  function getClass(classId) { return classes.find(c => c.id === classId); }

  async function toggleComplete(a) {
    const updated = await DB.toggleComplete(a.id, a.completed);
    setAssignments(list => list.map(x => x.id === a.id ? updated : x));
    showToast(updated.completed ? 'Marked complete!' : 'Marked incomplete', 'success');
  }

  function openAdd() {
    setForm({ ...emptyForm, dueDate: DB.todayStr() });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(a) {
    setForm({ name: a.name, classId: a.classId || '', dueDate: a.dueDate, dueTime: a.dueTime, priority: a.priority, estimatedTime: a.estimatedTime, notes: a.notes });
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

  function askDelete(id) { setDeleteId(id); setConfirmOpen(true); }

  async function handleDelete() {
    try {
      await DB.deleteAssignment(deleteId);
      setAssignments(list => list.filter(a => a.id !== deleteId));
      showToast('Assignment deleted');
    } catch { showToast('Error deleting', 'error'); }
    setConfirmOpen(false);
  }

  const filtered = getFilteredAssignments();

  if (loading) return <AppLayout title="Assignments" user={user}><div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div></AppLayout>;

  return (
    <AppLayout title="Assignments" user={user}>
      <div className="page-header">
        <h2>Assignments</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Assignment
        </button>
      </div>

      <div className="asgn-filters">
        {FILTERS.map(f => (
          <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <div className="filter-search">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search assignments…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <h3>No assignments found</h3>
          <p>{filter !== 'All' ? 'Try a different filter' : 'Add your first assignment to get started'}</p>
        </div>
      ) : (
        <div className="asgn-list">
          {filtered.map(a => {
            const cls = getClass(a.classId);
            const due = getDaysUntil(a.dueDate);
            return (
              <div
                className="asgn-list-item"
                key={a.id}
                style={{
                  borderLeft: `3px solid ${a.priority === 'high' ? 'var(--red)' : a.priority === 'medium' ? 'var(--yellow)' : 'var(--green)'}`,
                  paddingLeft: 17,
                  opacity: a.completed ? 0.65 : 1,
                }}
              >
                <div className={`asgn-list-check${a.completed ? ' done' : ''}`} onClick={() => toggleComplete(a)}>
                  {a.completed && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div className="asgn-list-info">
                  <div className={`asgn-list-name${a.completed ? ' done' : ''}`}>{a.name}</div>
                  <div className="asgn-list-meta">
                    {cls && <><div className="asgn-class-dot" style={{ background: cls.color }} /><span style={{ color: cls.color, fontWeight: 600 }}>{cls.name}</span></>}
                    {cls && <span style={{ color: 'var(--border)' }}>·</span>}
                    <span style={{ textTransform: 'capitalize', color: a.priority === 'high' ? 'var(--red)' : a.priority === 'medium' ? 'var(--yellow)' : 'var(--green)', fontWeight: 600, fontSize: 11 }}>{a.priority}</span>
                  </div>
                </div>
                <div className={`asgn-list-due${due.cls ? ' ' + due.cls : ''}`}>{fmtDate(a.dueDate)}</div>
                <div className="asgn-list-actions">
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(a)} title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => askDelete(a.id)} title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                    <input type="radio" id={`priority-${p}`} name="priority" value={p} checked={form.priority === p} onChange={() => setForm(f => ({ ...f, priority: p }))} />
                    <label htmlFor={`priority-${p}`}>
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

      {/* Confirm */}
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
