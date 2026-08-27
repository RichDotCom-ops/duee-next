'use client';
import { useEffect, useState } from 'react';
import { Auth } from '../lib/auth';

export default function Topbar({ title, user }) {
  const [avatarStyle, setAvatarStyle] = useState({});

  useEffect(() => {
    // Apply theme from localStorage
    const stored = localStorage.getItem('duee_theme');
    document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');

    // Check for saved avatar
    const saved = localStorage.getItem('duee_avatar');
    if (saved && (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(saved) || /^https:\/\//.test(saved))) {
      setAvatarStyle({ backgroundImage: `url(${saved})`, backgroundSize: 'cover', backgroundPosition: 'center' });
    }

    // Mobile sidebar
    const hamburger = document.getElementById('topbar-hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
      sidebar?.classList.add('mobile-open');
      overlay?.classList.add('visible');
    }
    function closeSidebar() {
      sidebar?.classList.remove('mobile-open');
      overlay?.classList.remove('visible');
    }

    hamburger?.addEventListener('click', openSidebar);
    overlay?.addEventListener('click', closeSidebar);

    return () => {
      hamburger?.removeEventListener('click', openSidebar);
      overlay?.removeEventListener('click', closeSidebar);
    };
  }, []);

  const initial = Auth.getUserInitial(user);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" id="topbar-hamburger" aria-label="Menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1>{title}</h1>
      </div>
      <div className="topbar-right">
        <div className="avatar" style={avatarStyle}>
          {Object.keys(avatarStyle).length === 0 ? initial : ''}
        </div>
      </div>
    </div>
  );
}
