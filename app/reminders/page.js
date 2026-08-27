'use client';
import { useEffect, useState } from 'react';
import { Auth } from '../../lib/auth';
import { DB } from '../../lib/data';
import AppLayout from '../../components/AppLayout';
import { showToast, initTheme } from '../../lib/utils';

const REMINDER_TIMES = ['15 minutes before', '30 minutes before', '1 hour before', '3 hours before', '1 day before', '2 days before', '1 week before'];

export default function RemindersPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    enabled: true,
    reminderTime: '1 day before',
    types: { dueToday: true, dueTomorrow: true, dueThisWeek: true, overdue: true },
  });

  useEffect(() => {
    initTheme();
    async function load() {
      const session = await Auth.requireAuth();
      if (!session) return;
      setUser(session.user);
      const saved = DB.getReminders(session.user.id);
      setPrefs(saved);
      setLoading(false);
    }
    load();
  }, []);

  function save(updated) {
    setPrefs(updated);
    if (user) DB.saveReminders(user.id, updated);
    showToast('Reminder preferences saved', 'success');
  }

  function toggleType(key) {
    const updated = { ...prefs, types: { ...prefs.types, [key]: !prefs.types[key] } };
    save(updated);
  }

  if (loading) return <AppLayout title="Reminders" user={user}><div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div></AppLayout>;

  return (
    <AppLayout title="Reminders" user={user}>
      <div className="page-header">
        <h2>Reminders</h2>
      </div>

      <div className="reminders-section">
        <div className="reminders-section-title">Notification Settings</div>
        <div className="reminder-row">
          <div className="reminder-info">
            <h4>Enable Reminders</h4>
            <p>Get browser notifications for upcoming deadlines</p>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={prefs.enabled} onChange={() => save({ ...prefs, enabled: !prefs.enabled })} />
            <div className="toggle-slider" />
          </label>
        </div>
        <div className="reminder-row">
          <div className="reminder-info">
            <h4>Remind Me</h4>
            <p>How far in advance to send reminders</p>
          </div>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={prefs.reminderTime}
            onChange={e => save({ ...prefs, reminderTime: e.target.value })}
            disabled={!prefs.enabled}
          >
            {REMINDER_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="reminders-section">
        <div className="reminders-section-title">Reminder Types</div>
        {[
          { key: 'dueToday', label: 'Due Today', desc: 'Remind me about assignments due today' },
          { key: 'dueTomorrow', label: 'Due Tomorrow', desc: 'Remind me about assignments due tomorrow' },
          { key: 'dueThisWeek', label: 'Due This Week', desc: 'Remind me about assignments due in the next 7 days' },
          { key: 'overdue', label: 'Overdue', desc: 'Alert me when assignments become overdue' },
        ].map(item => (
          <div className="reminder-row" key={item.key}>
            <div className="reminder-info">
              <h4>{item.label}</h4>
              <p>{item.desc}</p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={prefs.types[item.key]} onChange={() => toggleType(item.key)} disabled={!prefs.enabled} />
              <div className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <div className="reminders-section">
        <div className="reminders-section-title">Browser Permissions</div>
        <div className="reminder-row">
          <div className="reminder-info">
            <h4>Notification Permission</h4>
            <p>Allow duee. to send you browser notifications</p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission().then(perm => {
                  if (perm === 'granted') showToast('Notifications enabled!', 'success');
                  else showToast('Notification permission denied', 'error');
                });
              } else {
                showToast('Browser notifications not supported, please use different device', 'error');
              }
            }}
          >
            Request Permission
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
