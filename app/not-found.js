'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '../lib/auth';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [dest, setDest] = useState(null);

  useEffect(() => {
    Auth.getSession().then(session => {
      const target = session ? '/dashboard' : '/';
      setDest(target);
      const interval = setInterval(() => {
        setCountdown(n => {
          if (n <= 1) { clearInterval(interval); router.replace(target); return 0; }
          return n - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    });
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1f10 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      flexDirection: 'column', textAlign: 'center', padding: '24px',
    }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: '20%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '15%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* 404 */}
      <div style={{
        fontSize: 'clamp(80px, 20vw, 140px)',
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '-4px',
        background: 'linear-gradient(135deg, #4ade80, #16a34a)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 8,
      }}>
        404
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 10 }}>
        This page doesn&apos;t exist
      </div>
      <div style={{ fontSize: 15, color: '#64748b', marginBottom: 40, maxWidth: 320, lineHeight: 1.6 }}>
        Looks like you took a wrong turn. No worries — we&apos;ll get you back on track.
      </div>

      {/* Redirect notice */}
      <div style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>
        Redirecting you {dest === '/dashboard' ? 'to your dashboard' : 'home'} in{' '}
        <span style={{ color: '#4ade80', fontWeight: 700 }}>{countdown}s</span>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => router.replace(dest || '/')}
          style={{
            padding: '12px 28px', background: '#16a34a', color: 'white',
            border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {dest === '/dashboard' ? 'Go to Dashboard' : 'Go Home'}
        </button>
        <button
          onClick={() => router.back()}
          style={{
            padding: '12px 28px', background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Go Back
        </button>
      </div>

      <div style={{ marginTop: 48, fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
        duee<span style={{ color: '#4ade80' }}>.</span>
      </div>
    </div>
  );
}
