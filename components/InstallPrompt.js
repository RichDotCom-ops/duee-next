'use client';
import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('duee_install_dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 3s
      setTimeout(() => setVisible(true), 3000);
      return;
    }

    // Android/Chrome: listen for beforeinstallprompt
    function handler(e) {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => setVisible(true), 3000);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem('duee_install_dismissed', '1');
    setVisible(false);
    setDismissed(true);
  }

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') dismiss();
  }

  if (!visible || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 16, right: 16, zIndex: 9999,
      background: '#0d1117',
      border: '1px solid rgba(74,222,128,0.3)',
      borderRadius: 16,
      padding: '16px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,222,128,0.1)',
      display: 'flex', alignItems: 'center', gap: 14,
      // mobile only
      maxWidth: 480, margin: '0 auto',
    }}>
      {/* Logo */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #0a0f1e, #0d1f10)',
        border: '1px solid rgba(74,222,128,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 900, color: 'white',
        fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px',
      }}>
        d<span style={{ color: '#4ade80' }}>.</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>
          Install duee. on your home screen
        </div>
        {isIOS ? (
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
            Tap <span style={{ color: '#4ade80' }}>Share</span> then <span style={{ color: '#4ade80' }}>Add to Home Screen</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Fast access, works like an app
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {!isIOS && (
          <button
            onClick={install}
            style={{
              padding: '8px 14px', background: '#16a34a', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            color: '#64748b', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
