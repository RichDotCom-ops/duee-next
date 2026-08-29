'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const SUGGESTIONS = [
  'How is the site performing?',
  'Give me growth ideas for duee.',
  'What features should I build next?',
  'Write a tweet to promote duee.',
  'Analyze my user stats',
  'How do I improve retention?',
];

const WAKE_WORDS = ['wake up jarvis', 'wake up, jarvis', 'jarvis wake up', 'hey jarvis'];

function getHour() { return new Date().getHours(); }
function getGreeting() {
  const h = getHour();
  if (h < 12) return 'Good morning, Boss. Online and ready. What can I do for you?';
  if (h < 18) return 'Good afternoon, Boss. Systems online. What do you need?';
  return 'Good evening, Boss. At your service. What can I do for you?';
}

// Pick the best Jarvis-like voice: deep UK/US male
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const priority = [
    v => v.name === 'Google UK English Male',
    v => v.name.includes('Microsoft David'),
    v => v.name.includes('Microsoft Mark'),
    v => v.lang === 'en-GB' && !v.name.toLowerCase().includes('female'),
    v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man')),
    v => v.lang.startsWith('en'),
  ];
  for (const test of priority) {
    const found = voices.find(test);
    if (found) return found;
  }
  return voices[0] || null;
}

function speak(text, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  // Strip markdown for speech
  const clean = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,3}\s/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .slice(0, 800); // don't read forever
  const utter = new SpeechSynthesisUtterance(clean);
  utter.voice = pickVoice();
  utter.pitch = 0.85;
  utter.rate = 1.05;
  utter.volume = 1;
  utter.onend = onEnd || null;
  window.speechSynthesis.speak(utter);
}

function renderContent(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (!line) return <div key={i} style={{ height: 8 }} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**')
        ? <strong key={j} style={{ color: '#67e8f9' }}>{seg.slice(2, -2)}</strong>
        : seg
    );
    if (line.startsWith('- ') || line.startsWith('• '))
      return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#22d3ee', flexShrink: 0 }}>›</span><span>{parts}</span></div>;
    if (/^\d+\./.test(line))
      return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#22d3ee', flexShrink: 0, minWidth: 20 }}>{line.match(/^(\d+)\./)[1]}.</span><span>{parts.slice(1)}</span></div>;
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
  const [stats, setStats] = useState(null);
  const [time, setTime] = useState('');

  // Voice state
  const [listening, setListening] = useState(false);      // mic is on
  const [voiceActive, setVoiceActive] = useState(false);  // wake word triggered
  const [transcript, setTranscript] = useState('');       // live transcript
  const [speaking, setSpeaking] = useState(false);        // jarvis is speaking

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const secretRef = useRef('');
  const messagesRef = useRef([]);
  const recogRef = useRef(null);
  const voiceActiveRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    const saved = sessionStorage.getItem('jarvis_secret');
    if (saved) { secretRef.current = saved; setSecret(saved); setAuthed(true); }
  }, []);

  useEffect(() => {
    function tick() { setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })); }
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (authed) setTimeout(() => inputRef.current?.focus(), 100); }, [authed]);

  // ── Preload voices ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMsg = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loadingRef.current) return;
    setInput(''); setTranscript('');

    const userMsg = { role: 'user', content: msg, id: Date.now() };
    const history = [...messagesRef.current, userMsg];
    setMessages(history); messagesRef.current = history;
    setLoading(true); loadingRef.current = true;

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secretRef.current },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (res.status === 401) { setAuthed(false); sessionStorage.removeItem('jarvis_secret'); return; }
      if (data.stats) setStats(data.stats);
      const reply = data.error ? `Error: ${data.error}` : data.content;
      const aiMsg = { role: 'assistant', content: reply, id: Date.now() + 1 };
      const next = [...history, aiMsg];
      setMessages(next); messagesRef.current = next;
      // Speak the response
      setSpeaking(true);
      speak(reply, () => setSpeaking(false));
    } catch {
      const errMsg = { role: 'assistant', content: 'Connection error. Try again.', id: Date.now() + 1 };
      const next = [...history, errMsg];
      setMessages(next); messagesRef.current = next;
    } finally { setLoading(false); loadingRef.current = false; }
  }, [input]);

  // ── Voice recognition ─────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported. Use Chrome or Edge.'); return; }
    if (recogRef.current) { recogRef.current.stop(); recogRef.current = null; }

    const recog = new SR();
    recog.lang = 'en-US';
    recog.continuous = true;
    recog.interimResults = true;
    recogRef.current = recog;

    recog.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase().trim();
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      const all = (final || interim).toLowerCase().trim();
      setTranscript(all);

      // Wake word detection
      if (!voiceActiveRef.current && WAKE_WORDS.some(w => all.includes(w))) {
        setVoiceActive(true); voiceActiveRef.current = true;
        setTranscript('');
        window.speechSynthesis.cancel();
        const greeting = getGreeting();
        const greetMsg = { role: 'assistant', content: greeting, id: Date.now() };
        const next = [...messagesRef.current, greetMsg];
        setMessages(next); messagesRef.current = next;
        setSpeaking(true);
        speak(greeting, () => setSpeaking(false));
        return;
      }

      // If wake word active and we have a final result, send it
      if (voiceActiveRef.current && final && final.length > 2) {
        // Remove wake word echoes from the text
        const clean = WAKE_WORDS.reduce((t, w) => t.replace(w, ''), final).trim();
        if (clean.length > 2) {
          setVoiceActive(false); voiceActiveRef.current = false;
          sendMsg(clean);
        }
      }
    };

    recog.onend = () => {
      // Auto-restart if still in listening mode
      if (recogRef.current) {
        try { recog.start(); } catch {}
      }
    };

    recog.onerror = (e) => {
      if (e.error === 'not-allowed') { setListening(false); recogRef.current = null; }
    };

    recog.start();
    setListening(true);
  }, [sendMsg]);

  const stopListening = useCallback(() => {
    if (recogRef.current) { recogRef.current.stop(); recogRef.current = null; }
    setListening(false); setVoiceActive(false); setTranscript('');
    window.speechSynthesis?.cancel(); setSpeaking(false);
  }, []);

  function toggleVoice() {
    if (listening) stopListening(); else startListening();
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#020817', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', color: '#22d3ee', textTransform: 'uppercase', marginBottom: 24, opacity: 0.7 }}>Restricted Access</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: 6 }}>J.A.R.V.I.S</div>
          <div style={{ fontSize: 13, color: '#334155', marginBottom: 40, letterSpacing: '0.1em' }}>duee. founder intelligence system</div>
          <div style={{ display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto' }}>
            <input
              type="password" placeholder="Admin passphrase" value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && secret) { secretRef.current = secret; sessionStorage.setItem('jarvis_secret', secret); setAuthed(true); } }}
              autoFocus
              style={{ flex: 1, padding: '12px 16px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, color: 'white', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
            <button
              onClick={() => { if (secret) { secretRef.current = secret; sessionStorage.setItem('jarvis_secret', secret); setAuthed(true); } }}
              style={{ padding: '12px 20px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 10, color: '#22d3ee', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Authorize
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main interface ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', height: '100vh', background: '#020817', display: 'flex', flexDirection: 'column', fontFamily: "'Space Grotesk','Inter',sans-serif", color: 'white', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(6,182,212,0.15)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: speaking ? '#4ade80' : listening ? '#22d3ee' : '#22d3ee', boxShadow: `0 0 8px ${speaking ? '#4ade80' : '#22d3ee'}`, animation: (listening || speaking) ? 'pulse-dot 1.5s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px', color: '#22d3ee' }}>J.A.R.V.I.S</span>
          </div>
          <span style={{ fontSize: 11, color: '#334155', letterSpacing: '0.1em' }}>
            {speaking ? 'Speaking...' : voiceActive ? 'Listening for command...' : listening ? 'Say "Wake up Jarvis"' : 'duee. intelligence'}
          </span>
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
          <button onClick={() => { sessionStorage.removeItem('jarvis_secret'); stopListening(); setAuthed(false); setMessages([]); }} style={{ fontSize: 11, color: '#475569', background: 'none', border: '1px solid #1e293b', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Disconnect</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 1 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px', color: 'rgba(34,211,238,0.15)', marginBottom: 8 }}>JARVIS</div>
            <div style={{ fontSize: 14, color: '#334155', marginBottom: 8 }}>Ready to assist, sir.</div>
            <div style={{ fontSize: 12, color: '#1e3a4a', marginBottom: 28 }}>Say <span style={{ color: '#22d3ee' }}>"Wake up Jarvis"</span> or type below</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560, margin: '0 auto' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMsg(s)}
                  style={{ padding: '8px 16px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 99, fontSize: 12, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                  onMouseEnter={e => { e.target.style.borderColor = 'rgba(6,182,212,0.4)'; e.target.style.color = '#22d3ee'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'rgba(6,182,212,0.15)'; e.target.style.color = '#64748b'; }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', gap: 14, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#22d3ee' }}>J</div>
            )}
            <div style={{ maxWidth: '72%', padding: '12px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.65, background: m.role === 'user' ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.03)', border: m.role === 'user' ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(255,255,255,0.06)', color: m.role === 'user' ? '#e2e8f0' : '#94a3b8' }}>
              {m.role === 'assistant' ? renderContent(m.content) : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#22d3ee' }}>J</div>
            <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}

        {/* Live transcript bubble */}
        {listening && transcript && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '72%', padding: '10px 14px', borderRadius: 12, fontSize: 13, background: 'rgba(6,182,212,0.06)', border: '1px dashed rgba(6,182,212,0.25)', color: '#475569', fontStyle: 'italic' }}>
              {transcript}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(6,182,212,0.15)', padding: '16px 28px', background: 'rgba(2,8,23,0.9)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', gap: 10, maxWidth: 860, margin: '0 auto' }}>

          {/* Mic button */}
          <button
            onClick={toggleVoice}
            title={listening ? 'Stop listening' : 'Start voice mode'}
            style={{
              width: 46, height: 46, borderRadius: 10, flexShrink: 0,
              background: listening ? 'rgba(34,211,238,0.15)' : 'rgba(6,182,212,0.05)',
              border: `1px solid ${listening ? 'rgba(34,211,238,0.5)' : 'rgba(6,182,212,0.2)'}`,
              color: listening ? '#22d3ee' : '#475569',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: listening ? 'mic-glow 2s ease-in-out infinite' : 'none',
              transition: 'all .2s',
            }}
          >
            {listening ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            )}
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
            placeholder={listening ? 'Say "Wake up Jarvis" or type here...' : 'Ask Jarvis anything about duee...'}
            style={{ flex: 1, padding: '13px 18px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, color: 'white', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(6,182,212,0.2)'}
          />
          <button
            onClick={() => sendMsg()}
            disabled={!input.trim() || loading}
            style={{ padding: '13px 22px', background: loading ? 'rgba(6,182,212,0.05)' : 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 10, color: '#22d3ee', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: (!input.trim() || loading) ? 0.4 : 1, transition: 'all .15s' }}
          >
            Send
          </button>
        </div>

        {/* Voice status */}
        {listening && (
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: voiceActive ? '#22d3ee' : '#1e3a4a' }}>
            {voiceActive ? '🎙 Listening for your command...' : '🔵 Say "Wake up Jarvis" to activate voice'}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes mic-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(34,211,238,0); }
        }
      `}</style>
    </div>
  );
}
