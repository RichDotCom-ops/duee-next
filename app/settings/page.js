'use client';
import { useEffect, useState } from 'react';
import { Auth } from '../../lib/auth';
import { DB } from '../../lib/data';
import AppLayout from '../../components/AppLayout';
import { showToast, initTheme, applyTheme } from '../../lib/utils';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [prefs, setPrefs] = useState({ theme: 'light', weekStartDay: 'Monday', timeFormat: '12 Hour' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    initTheme();
    async function load() {
      const session = await Auth.requireAuth();
      if (!session) return;
      const u = session.user;
      setUser(u);
      setName(Auth.getUserName(u));
      const p = DB.getPreferences(u.id);
      setPrefs(p);
      const saved = localStorage.getItem('duee_avatar');
      if (saved) setAvatarPreview(saved);
      setLoading(false);
    }
    load();
  }, []);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await Auth.updateProfile(name);
    if (error) showToast(error.message, 'error');
    else showToast('Profile updated!', 'success');
    setSavingProfile(false);
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    if (newPassword.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    setSavingPassword(true);
    const { error } = await Auth.updatePassword(newPassword);
    if (error) showToast(error.message, 'error');
    else { showToast('Password updated!', 'success'); setNewPassword(''); setConfirmPassword(''); }
    setSavingPassword(false);
  }

  function savePrefs(updated) {
    setPrefs(updated);
    if (user) DB.savePreferences(user.id, updated);
  }

  function handleTheme(t) {
    const updated = { ...prefs, theme: t };
    savePrefs(updated);
    applyTheme(t);
    showToast(`${t === 'dark' ? 'Dark' : 'Light'} mode enabled`);
  }

  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target.result;
      setAvatarPreview(data);
      localStorage.setItem('duee_avatar', data);
      showToast('Avatar updated!', 'success');
    };
    reader.readAsDataURL(file);
  }

  if (loading) return <AppLayout title="Settings" user={user}><div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div></AppLayout>;

  return (
    <AppLayout title="Settings" user={user}>
      <div className="page-header"><h2>Settings</h2></div>

      <div className="settings-grid">
        {/* Profile */}
        <div className="settings-section">
          <div className="settings-section-title">Profile</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: avatarPreview ? 'transparent' : 'var(--green)', backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 800 }}>
              {!avatarPreview && Auth.getUserInitial(user)}
            </div>
            <div>
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                Change Avatar
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              </label>
            </div>
          </div>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>Display Name</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-control" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save Profile'}</button>
          </form>
        </div>

        {/* Security */}
        <div className="settings-section">
          <div className="settings-section-title">Security</div>
          <form onSubmit={handleUpdatePassword}>
            <div className="form-group">
              <label>New Password</label>
              <input className="form-control" type="password" placeholder="At least 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input className="form-control" type="password" placeholder="Repeat new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingPassword}>{savingPassword ? 'Updating…' : 'Update Password'}</button>
          </form>
        </div>

        {/* Preferences */}
        <div className="settings-section">
          <div className="settings-section-title">Preferences</div>
          <div className="settings-row">
            <div className="settings-row-label">Theme</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn btn-sm ${prefs.theme !== 'dark' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleTheme('light')}>Light</button>
              <button className={`btn btn-sm ${prefs.theme === 'dark' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleTheme('dark')}>Dark</button>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">Week Starts On</div>
            <select className="form-control" style={{ width: 'auto' }} value={prefs.weekStartDay} onChange={e => savePrefs({ ...prefs, weekStartDay: e.target.value })}>
              <option>Monday</option>
              <option>Sunday</option>
            </select>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">Time Format</div>
            <select className="form-control" style={{ width: 'auto' }} value={prefs.timeFormat} onChange={e => savePrefs({ ...prefs, timeFormat: e.target.value })}>
              <option>12 Hour</option>
              <option>24 Hour</option>
            </select>
          </div>
        </div>

        {/* Danger zone */}
        <div className="settings-section">
          <div className="settings-section-title">Account</div>
          <div className="settings-row">
            <div className="settings-row-label">Sign out of duee.</div>
            <button className="btn btn-outline btn-sm" onClick={() => Auth.signOut()}>Sign Out</button>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Reset All Data</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Delete all classes &amp; assignments and start fresh</div>
            </div>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--yellow)', borderColor: 'var(--yellow)' }} onClick={() => setResetOpen(true)}>Reset</button>
          </div>
          <div className="settings-row">
            <div className="settings-danger">Delete Account</div>
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmOpen(true)}>Delete</button>
          </div>
        </div>
      </div>

      {/* Confirm reset data */}
      <div className={`confirm-overlay${resetOpen ? ' open' : ''}`}>
        <div className="confirm-box">
          <h3>Reset all data?</h3>
          <p>This will delete all your classes and assignments. Your account will remain, but you&apos;ll start with a clean slate. This cannot be undone.</p>
          <div className="confirm-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setResetOpen(false)} disabled={resetting}>Cancel</button>
            <button className="btn btn-danger btn-sm" disabled={resetting} onClick={async () => {
              setResetting(true);
              try {
                await DB.resetAllData(user.id);
                showToast('All data cleared. Fresh start!', 'success');
              } catch {
                showToast('Failed to reset data. Try again.', 'error');
              } finally {
                setResetting(false);
                setResetOpen(false);
              }
            }}>{resetting ? 'Clearing…' : 'Yes, Reset Everything'}</button>
          </div>
        </div>
      </div>

      {/* Confirm delete account */}
      <div className={`confirm-overlay${confirmOpen ? ' open' : ''}`}>
        <div className="confirm-box">
          <h3>Delete account?</h3>
          <p>This will permanently delete your account, classes, and all assignments. This cannot be undone.</p>
          <div className="confirm-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button className="btn btn-danger btn-sm" onClick={async () => {
              showToast('Please contact support to delete your account', 'error');
              setConfirmOpen(false);
            }}>Delete Account</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
