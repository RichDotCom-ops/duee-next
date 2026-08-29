'use client';
import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'How is the site performing?',
  'Give me growth ideas for duee.',
  'What features should I build next?',
  'Write a tweet to promote duee.',
  'Analyze my user stats',
  'How do I improve retention?',
];

function renderContent(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (!line) return <div key={i} style={{ height: 8 }} />;
    // Bold
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**')
        ? <strong key={j} style={{ color: '#67e8f9' }}>{seg.slice(2, -2)}</strong>
        : seg
    );
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#22d3ee', flexShrink: 0 }}>›</span><span>{parts}</span></div>;
    }
    if (/^\d+\./.test(line)) {
      return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#22d3ee', flexShrink: 0, minWidth: 20 }}>{line.match(/^(\d+)\./)[1]}.</span><span>{parts.slice(1)}</span></div>;
    }
    if (line.startsWith('### ')) return <div key={i} style={{ fontSize: 14, fontWeight: 700, color: '#22d3ee', marginTop: 12, marginBottom: 4 }}>{line.slice(4)}</div>;
    if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 16, fontWeight: 700, color: '#67e8f9', marginTop: 14, marginBottom: 6 }}>{line.slice(3)}</div>;
    return <div key={i} style={{ marginBottom: 2 }}>{parts}</div>;
  });
}

export default function JarvisPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [time, setTime] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const secretRef = useRef('');

  useEffect(() => {
    const saved = sessionStorage.getItem('jarvis_secret');
    if (saved) { secretRef.current = saved; setSecret(saved); setAuthed(true); }
  }, []);

  useEffect(() => {
    function tick() { setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })); }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (authed) setTimeout(() => inputRef.current?.focus(), 100); }, [authed]);

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, id: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secretRef.current },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (res.status === 401) { setAuthed(false); sessionStorage.removeItem('jarvis_secret'); return; }
      if (data.stats) setStats(data.stats);
      const aiMsg = { role: 'assistant', content: data.error ? `Error: ${data.error}` : data.content, id: Date.now() + 1 };
      setMessages([...history, aiMsg]);
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Connection error. Try again.', id: Date.now() + 1 }]);
    } finally { setLoading(false); }
  }

  function login() {
    if (!secret) return;
    secretRef.current = secret;
    sessionStorage.setItem('jarvis_secret', secret);
    setAuthed(true);
    setError('');
    // Send greeting
    setTimeout(() => send('Give me a quick briefing on how duee.online is doing right now.'), 300);
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', background: '#020817',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Grotesk','Inter',sans-serif",
      }}>
        {/* Grid */}
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', color: '#22d3ee', textTransform: 'uppercase', marginBottom: 24, opacity: 0.7 }}>
            Restricted Access
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: 6 }}>
            J.A.R.V.I.S
          </div>
          <div style={{ fontSize: 13, color: '#334155', marginBottom: 40, letterSpacing: '0.1em' }}>
            duee. founder intelligence system
          </div>

          <div style={{ display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto' }}>
            <input
              type="password"
              placeholder="Admin passphrase"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              autoFocus
              style={{
                flex: 1, padding: '12px 16px', background: 'rgba(6,182,212,0.05)',
                border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10,
                color: 'white', fontSize: 14, fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={login}
              style={{
                padding: '12px 20px', background: 'rgba(6,182,212,0.15)',
                border: '1px solid rgba(6,182,212,0.4)', borderRadius: 10,
                color: '#22d3ee', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              Authorize
            </button>
          </div>
          {error && <div style={{ marginTop: 12, fontSize: 13, color: '#f87171' }}>{error}</div>}
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', height: '100vh', background: '#020817',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Space Grotesk','Inter',sans-serif", color: 'white',
      overflow: 'hidden',
    }}>
      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(6,182,212,0.15)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(2,8,23,0.8)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }} />
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px', color: '#22d3ee' }}>J.A.R.V.I.S</span>
          </div>
          <span style={{ fontSize: 11, color: '#334155', letterSpacing: '0.1em' }}>duee. intelligence</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {stats && (
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: '#475569' }}>Users: <span style={{ color: '#22d3ee', fontWeight: 700 }}>{stats.totalUsers}</span></span>
              <span style={{ color: '#475569' }}>Today: <span style={{ color: '#4ade80', fontWeight: 700 }}>+{stats.newToday}</span></span>
              <span style={{ color: '#475569' }}>Active: <span style={{ color: '#a78bfa', fontWeight: 700 }}>{stats.activeUsers}</span></span>
            </div>
          )}
          <div style={{ fontSize: 12, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>{time}</div>
          <button
            onClick={() => { sessionStorage.removeItem('jarvis_secret'); setAuthed(false); setMessages([]); }}
            style={{ fontSize: 11, color: '#475569', background: 'none', border: '1px solid #1e293b', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 1 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px', color: 'rgba(34,211,238,0.15)', marginBottom: 8 }}>JARVIS</div>
            <div style={{ fontSize: 14, color: '#334155' }}>Ready to assist, sir.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 32, maxWidth: 560, margin: '32px auto 0' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{ padding: '8px 16px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 99, fontSize: 12, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                  onMouseEnter={e => { e.target.style.borderColor = 'rgba(6,182,212,0.4)'; e.target.style.color = '#22d3ee'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'rgba(6,182,212,0.15)'; e.target.style.color = '#64748b'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', gap: 14, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#22d3ee' }}>J</div>
            )}
            <div style={{
              maxWidth: '72%', padding: '12px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.65,
              background: m.role === 'user' ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.03)',
              border: m.role === 'user' ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(255,255,255,0.06)',
              color: m.role === 'user' ? '#e2e8f0' : '#94a3b8',
            }}>
              {m.role === 'assistant' ? renderContent(m.content) : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#22d3ee' }}>J</div>
            <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', opacity: 0.5, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(6,182,212,0.15)', padding: '16px 28px', background: 'rgba(2,8,23,0.9)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', gap: 10, maxWidth: 860, margin: '0 auto' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask Jarvis anything about duee..."
            style={{
              flex: 1, padding: '13px 18px',
              background: 'rgba(6,182,212,0.05)',
              border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: 10, color: 'white', fontSize: 14,
              fontFamily: 'inherit', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(6,182,212,0.2)'}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              padding: '13px 22px', background: loading ? 'rgba(6,182,212,0.05)' : 'rgba(6,182,212,0.15)',
              border: '1px solid rgba(6,182,212,0.4)', borderRadius: 10,
              color: '#22d3ee', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: (!input.trim() || loading) ? 0.4 : 1,
              transition: 'all .15s',
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
