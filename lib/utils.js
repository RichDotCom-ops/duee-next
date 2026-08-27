'use client';

export function showToast(msg, type = '') {
  if (typeof document === 'undefined') return;
  let t = document.getElementById('duee-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'duee-toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

export function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function fmtTime24to12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function getDaysUntil(dateStr) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((due - now) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'overdue' };
  if (diff === 0) return { label: 'Due today', cls: 'today' };
  if (diff === 1) return { label: 'Due tomorrow', cls: '' };
  return { label: `${diff} days left`, cls: '' };
}

export function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function isToday(dateStr) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return d.getTime() === now.getTime();
}

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('duee_theme', t);
}

export function initTheme() {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem('duee_theme');
  document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');
}

export const CLASS_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#0891b2', '#dc2626', '#b45309', '#0d9488', '#9333ea', '#db2777', '#64748b'];
export const CLASS_ICONS = ['book-open', 'code', 'feather', 'globe', 'star', 'zap', 'cpu', 'layers', 'award', 'activity'];
