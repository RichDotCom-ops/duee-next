'use client';
import { useEffect, useState } from 'react';
import { Auth } from '../../lib/auth';
import { DB } from '../../lib/data';
import AppLayout from '../../components/AppLayout';
import { showToast, initTheme, CLASS_COLORS } from '../../lib/utils';

const CLASS_SVG_ICONS = {
  book: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  code: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  science: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>,
  math: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  art: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  music: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  sports: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  globe: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  star: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  fire: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
};

function getIcon(key) {
  return CLASS_SVG_ICONS[key] || CLASS_SVG_ICONS.book;
}

const CLASS_ICONS = [
  { key: 'book', label: 'Book' }, { key: 'code', label: 'Code' },
  { key: 'science', label: 'Science' }, { key: 'math', label: 'Math' },
  { key: 'art', label: 'Art' }, { key: 'music', label: 'Music' },
  { key: 'sports', label: 'Sports' }, { key: 'globe', label: 'Globe' },
  { key: 'star', label: 'Star' }, { key: 'fire', label: 'Fire' },
];

const emptyForm = { name: '', professor: '', color: CLASS_COLORS[0], icon: 'book' };

export default function ClassesPage() {
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
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

  function openAdd() { setForm(emptyForm); setEditingId(null); setModalOpen(true); }

  function openEdit(cls) {
    setForm({ name: cls.name, professor: cls.professor, color: cls.color, icon: cls.icon });
    setEditingId(cls.id);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await DB.updateClass(user.id, editingId, form);
        setClasses(cls => cls.map(c => c.id === editingId ? updated : c));
        showToast('Class updated', 'success');
      } else {
        const newCls = await DB.addClass(user.id, form);
        setClasses(cls => [...cls, newCls]);
        showToast('Class added', 'success');
      }
      setModalOpen(false);
    } catch { showToast('Error saving class', 'error'); }
    finally { setSaving(false); }
  }

  function askDelete(id) { setDeleteId(id); setConfirmOpen(true); }

  async function handleDelete() {
    try {
      await DB.deleteClass(deleteId);
      setClasses(cls => cls.filter(c => c.id !== deleteId));
      showToast('Class deleted');
    } catch { showToast('Error deleting class', 'error'); }
    setConfirmOpen(false);
    setDeleteId(null);
  }

  if (loading) {
    return (
      <AppLayout title="Classes" user={user}>
        <div className="classes-grid" style={{ marginTop: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skel-card" style={{ height: 140 }} />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Classes" user={user}>
      <div className="page-header">
        <h2>My Classes</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Class
        </button>
      </div>

      <div className="classes-grid">
        {classes.map(cls => {
          const pending = assignments.filter(a => a.classId === cls.id && !a.completed).length;
          const total = assignments.filter(a => a.classId === cls.id).length;
          const done = total - pending;
          return (
            <div className="class-card" key={cls.id} style={{ borderTop: `4px solid ${cls.color}`, paddingTop: 16 }}>
              <div className="class-top">
                <div className="class-icon" style={{ background: cls.color, color: 'white' }}>
                  {getIcon(cls.icon)}
                </div>
                <div className="class-actions">
                  <button className="class-action-btn" onClick={() => openEdit(cls)} title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="class-action-btn delete" onClick={() => askDelete(cls.id)} title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
              <div className="class-name">{cls.name}</div>
              {cls.professor && <div className="class-prof">{cls.professor}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: cls.color, width: total > 0 ? `${(done / total) * 100}%` : '0%', transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>{done}/{total}</span>
              </div>
            </div>
          );
        })}

        <div className="add-class-card" onClick={openAdd}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Add a class</span>
        </div>
      </div>

      {/* Modal */}
      <div className={`modal-overlay${modalOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">{editingId ? 'Edit Class' : 'Add Class'}</div>
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Class Name *</label>
              <input className="form-control" placeholder="e.g. Calculus II" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Professor</label>
              <input className="form-control" placeholder="e.g. Dr. Smith" value={form.professor} onChange={e => setForm(f => ({ ...f, professor: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                {CLASS_COLORS.map(c => (
                  <div key={c} className={`color-swatch${form.color === c ? ' selected' : ''}`} style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Icon</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CLASS_ICONS.map(ic => (
                  <button
                    key={ic.key} type="button" title={ic.label}
                    onClick={() => setForm(f => ({ ...f, icon: ic.key }))}
                    style={{
                      width: 40, height: 40, borderRadius: 8,
                      border: `2px solid ${form.icon === ic.key ? form.color : 'var(--border)'}`,
                      background: form.icon === ic.key ? form.color : 'transparent',
                      color: form.icon === ic.key ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}
                  >
                    {getIcon(ic.key)}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Class'}</button>
            </div>
          </form>
        </div>
      </div>

      <div className={`confirm-overlay${confirmOpen ? ' open' : ''}`}>
        <div className="confirm-box">
          <h3>Delete class?</h3>
          <p>This will remove the class. Assignments linked to it will remain but lose the class tag.</p>
          <div className="confirm-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
